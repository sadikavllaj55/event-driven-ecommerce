package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"path"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"user-service/internal/domain"
	"user-service/internal/repository"
)

// PasswordHasher abstracts password hashing/checking (so the service
// doesn't depend directly on bcrypt).
type PasswordHasher interface {
	Hash(password string) (string, error)
	Check(password, hash string) error
}

// EventPublisher abstracts publishing user events.
type EventPublisher interface {
	PublishUserRegistered(userID, email, name, verificationToken string) error
}

// TOTPProvider abstracts TOTP secret generation and verification
type TOTPProvider interface {
	Generate(accountEmail string) (secret string, otpauthURL string, err error)
	Verify(code, secret string) bool
}

// UserService holds the business logic for users
type UserService struct {
	repo      repository.UserRepository
	hasher    PasswordHasher
	publisher EventPublisher
	totp      TOTPProvider
	storage   AvatarStorage
	search    MemberSearch
	indexMu   sync.Mutex
}

type MemberSearch interface {
	SearchProfiles(ctx context.Context, query string) ([]domain.Profile, error)
	IndexProfile(ctx context.Context, profile domain.Profile) error
	DeleteProfile(ctx context.Context, userID string) error
}

// AvatarStorage uploads profile images and returns their public URL.
// The service doesn't know (or care) that it's MinIO underneath.
type AvatarStorage interface {
	UploadAvatar(objectName string, reader io.Reader, size int64, contentType string) (string, error)
}

func NewUserService(repo repository.UserRepository, hasher PasswordHasher, publisher EventPublisher, totp TOTPProvider, storage AvatarStorage, search MemberSearch) *UserService {
	return &UserService{repo: repo, hasher: hasher, publisher: publisher, totp: totp, storage: storage, search: search}
}

// Register validates input, creates an unverified user, and publishes a
// user.registered event (which triggers the verification email).
func (s *UserService) Register(ctx context.Context, email, password, name, role string) (*domain.User, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	name = strings.TrimSpace(name)

	// Validation
	if email == "" || password == "" || name == "" {
		return nil, domain.ErrInvalidInput
	}
	if len(password) < 6 {
		return nil, domain.ErrWeakPassword
	}
	if role == "" {
		role = domain.RoleBuyer
	}
	if !domain.IsValidRegistrationRole(role) {
		return nil, domain.ErrInvalidRole
	}

	// Hash the password
	hash, err := s.hasher.Hash(password)
	if err != nil {
		return nil, err
	}

	// Build the user + verification token
	verificationToken := uuid.NewString()
	user := domain.User{
		ID:           uuid.NewString(),
		Email:        email,
		PasswordHash: hash,
		Name:         name,
		Role:         role,
		Verified:     false,
		CreatedAt:    time.Now().UTC(),
	}

	// Persist
	if err := s.repo.Create(ctx, user, verificationToken); err != nil {
		return nil, err // may be ErrEmailExists
	}
	s.syncProfile(ctx, user.ID)

	// Publish the event (best-effort — registration still succeeds if this fails)
	if err := s.publisher.PublishUserRegistered(user.ID, user.Email, user.Name, verificationToken); err != nil {
		// We intentionally don't fail registration on a publish error.
		// A real system would retry / outbox this.
		_ = err
	}

	return &user, nil
}

// Login verifies credentials and enforces email verification.
func (s *UserService) Login(ctx context.Context, email, password string) (*domain.User, error) {
	email = strings.TrimSpace(strings.ToLower(email))

	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		// Uniform error to prevent email enumeration
		return nil, domain.ErrInvalidCredentials
	}

	// Check password BEFORE verification status (don't leak verification
	// state to someone with the wrong password)
	if err := s.hasher.Check(password, user.PasswordHash); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	if !user.Verified {
		return nil, domain.ErrEmailNotVerified
	}
	if user.Status == domain.UserStatusBanned {
		return nil, domain.ErrUserBanned
	}

	// If 2FA is enabled, signal that a code is required (don't return the user yet)
	if user.TOTPEnabled {
		return nil, domain.Err2FARequired
	}

	return user, nil
}

func (s *UserService) SearchProfiles(ctx context.Context, query string) ([]domain.Profile, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return []domain.Profile{}, nil
	}
	if utf8.RuneCountInString(query) > 100 {
		return nil, domain.ErrInvalidInput
	}
	profiles, err := s.search.SearchProfiles(ctx, query)
	if err != nil {
		return nil, err
	}
	visible := make([]domain.Profile, 0, len(profiles))
	for _, profile := range profiles {
		user, err := s.repo.GetByID(ctx, profile.ID)
		if err != nil {
			if errors.Is(err, domain.ErrUserNotFound) {
				continue
			}
			return nil, err
		}
		if user.Status == domain.UserStatusActive {
			visible = append(visible, user.ToProfile())
		}
	}
	return visible, nil
}

func (s *UserService) ReindexProfiles(ctx context.Context) error {
	s.indexMu.Lock()
	defer s.indexMu.Unlock()
	users, err := s.repo.ListProfileUsers(ctx)
	if err != nil {
		return err
	}
	for _, user := range users {
		if err := s.indexProfile(ctx, user); err != nil {
			return err
		}
	}
	return nil
}

func (s *UserService) indexProfile(ctx context.Context, user domain.User) error {
	if user.Status != domain.UserStatusActive {
		return s.search.DeleteProfile(ctx, user.ID)
	}
	return s.search.IndexProfile(ctx, user.ToProfile())
}

func (s *UserService) syncProfile(ctx context.Context, userID string) {
	s.indexMu.Lock()
	defer s.indexMu.Unlock()
	user, err := s.repo.GetByID(ctx, userID)
	if err == nil {
		err = s.indexProfile(ctx, *user)
	}
	if err != nil {
		log.Printf("Member index update failed for %s; periodic reconciliation will retry: %v", userID, err)
	}
}

// GetByID returns a user's profile
func (s *UserService) GetByID(ctx context.Context, id string) (*domain.User, error) {
	return s.repo.GetByID(ctx, id)
}

// Verify marks a user verified using their verification token
func (s *UserService) Verify(ctx context.Context, token string) error {
	if strings.TrimSpace(token) == "" {
		return domain.ErrInvalidToken
	}
	return s.repo.VerifyByToken(ctx, token)
}

// Setup2FA generates a TOTP secret for the user and returns the otpauth URL (for the QR).
// The secret is stored but 2FA is NOT enabled until verified.
func (s *UserService) Setup2FA(ctx context.Context, userID string) (otpauthURL string, err error) {
	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return "", err
	}
	if user.TOTPEnabled {
		return "", domain.Err2FAAlreadyEnabled
	}

	secret, url, err := s.totp.Generate(user.Email)
	if err != nil {
		return "", err
	}

	if err := s.repo.SetTOTPSecret(ctx, userID, secret); err != nil {
		return "", err
	}

	return url, nil
}

// Enable2FA verifies a code against the stored secret, then enables 2FA.
func (s *UserService) Enable2FA(ctx context.Context, userID, code string) error {
	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user.TOTPEnabled {
		return domain.Err2FAAlreadyEnabled
	}
	if user.TOTPSecret == "" {
		return domain.Err2FANotEnabled // no setup done yet
	}

	if !s.totp.Verify(code, user.TOTPSecret) {
		return domain.ErrInvalid2FACode
	}

	return s.repo.EnableTOTP(ctx, userID)
}

// Verify2FALogin verifies a TOTP code for a user during login (step 2)
func (s *UserService) Verify2FALogin(ctx context.Context, email, code string) (*domain.User, error) {
	email = strings.TrimSpace(strings.ToLower(email))

	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		return nil, domain.ErrInvalidCredentials
	}
	if !user.TOTPEnabled {
		return nil, domain.Err2FANotEnabled
	}
	if !s.totp.Verify(code, user.TOTPSecret) {
		return nil, domain.ErrInvalid2FACode
	}
	return user, nil
}

// ListUsers returns all users (admin)
func (s *UserService) ListUsers(ctx context.Context) ([]domain.User, error) {
	return s.repo.ListUsers(ctx)
}

// SetUserStatus bans/reactivates a user. Admins can't modify themselves.
func (s *UserService) SetUserStatus(ctx context.Context, adminID, targetID, status string) error {
	if !domain.IsValidUserStatus(status) {
		return domain.ErrInvalidStatus
	}
	if adminID == targetID {
		return domain.ErrCannotSelfModify
	}
	if err := s.repo.UpdateStatus(ctx, targetID, status); err != nil {
		return err
	}
	s.syncProfile(ctx, targetID)
	return nil
}

// SetUserRole changes a user's role. Admins can't change their own role.
func (s *UserService) SetUserRole(ctx context.Context, adminID, targetID, role string) error {
	if !domain.IsValidRole(role) {
		return domain.ErrInvalidRole
	}
	if adminID == targetID {
		return domain.ErrCannotSelfModify
	}
	return s.repo.UpdateRole(ctx, targetID, role)
}

// Stats returns user counts (for admin dashboard)
func (s *UserService) Stats(ctx context.Context) (map[string]int, error) {
	return s.repo.CountUsers(ctx)
}

// GetProfile returns a user's PUBLIC profile (no email, role, or 2FA data).
// Banned users are hidden, as if they don't exist.
func (s *UserService) GetProfile(ctx context.Context, userID string) (*domain.Profile, error) {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if u.Status == domain.UserStatusBanned {
		return nil, domain.ErrUserNotFound
	}
	p := u.ToProfile()
	return &p, nil
}

// UpdateBio validates and saves the current user's bio
func (s *UserService) UpdateBio(ctx context.Context, userID, bio string) (*domain.Profile, error) {
	bio = strings.TrimSpace(bio)
	if utf8.RuneCountInString(bio) > domain.MaxBioLength {
		return nil, domain.ErrBioTooLong
	}
	if err := s.repo.UpdateBio(ctx, userID, bio); err != nil {
		return nil, err
	}
	s.syncProfile(ctx, userID)
	return s.GetProfile(ctx, userID)
}

// UploadAvatar validates the image, stores it, and saves its URL on the user
func (s *UserService) UploadAvatar(
	ctx context.Context,
	userID, filename, contentType string,
	reader io.Reader,
	size int64,
) (*domain.Profile, error) {
	if !strings.HasPrefix(contentType, "image/") {
		return nil, domain.ErrInvalidImage
	}
	if size > domain.MaxAvatarSize {
		return nil, domain.ErrImageTooLarge
	}

	// Unique name per upload, namespaced by user (avoids browser cache showing an old avatar)
	objectName := fmt.Sprintf("%s/%d-%s", userID, time.Now().UnixNano(), path.Base(filename))

	url, err := s.storage.UploadAvatar(objectName, reader, size, contentType)
	if err != nil {
		return nil, err
	}
	if err := s.repo.UpdateAvatarURL(ctx, userID, url); err != nil {
		return nil, err
	}
	s.syncProfile(ctx, userID)
	return s.GetProfile(ctx, userID)
}
