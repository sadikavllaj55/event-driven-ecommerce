package service

import (
	"context"
	"strings"
	"time"

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

// UserService holds the business logic for users
type UserService struct {
	repo      repository.UserRepository
	hasher    PasswordHasher
	publisher EventPublisher
}

// NewUserService wires the service with its dependencies
func NewUserService(repo repository.UserRepository, hasher PasswordHasher, publisher EventPublisher) *UserService {
	return &UserService{repo: repo, hasher: hasher, publisher: publisher}
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

	return user, nil
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
