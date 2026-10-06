package domain

import (
	"errors"
	"time"
)

// User represents a registered user
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	Status       string    `json:"status"`
	Verified     bool      `json:"verified"`
	TOTPSecret   string    `json:"-"` // never expose the secret
	TOTPEnabled  bool      `json:"totp_enabled"`
	AvatarURL    string    `json:"avatar_url"`
	Bio          string    `json:"bio"`
	CreatedAt    time.Time `json:"created_at"`
}

// Profile is the PUBLIC view of a user (seller shop page).
// It deliberately has no email, role, status, or 2FA fields.
type Profile struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatar_url"`
	Bio       string    `json:"bio"`
	CreatedAt time.Time `json:"created_at"` // "member since"
}

// ToProfile converts a User into its public Profile
func (u User) ToProfile() Profile {
	return Profile{
		ID:        u.ID,
		Name:      u.Name,
		AvatarURL: u.AvatarURL,
		Bio:       u.Bio,
		CreatedAt: u.CreatedAt,
	}
}

// MaxBioLength caps the profile bio
const MaxBioLength = 500

// MaxAvatarSize caps avatar uploads (2 MB)
const MaxAvatarSize = 2 << 20

// Valid roles
const (
	RoleBuyer  = "buyer"
	RoleSeller = "seller"
	RoleAdmin  = "admin"
)

// User status values
const (
	UserStatusActive = "active"
	UserStatusBanned = "banned"
)

var validUserStatuses = map[string]bool{
	UserStatusActive: true,
	UserStatusBanned: true,
}

func IsValidUserStatus(s string) bool {
	return validUserStatuses[s]
}

// Valid roles (for admin role changes)
var validRoles = map[string]bool{
	"buyer": true, "seller": true, "admin": true,
}

func IsValidRole(r string) bool {
	return validRoles[r]
}

// Domain errors
var (
	ErrEmailExists        = errors.New("email already registered")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidInput       = errors.New("invalid input")
	ErrInvalidRole        = errors.New("role must be 'buyer' or 'seller'")
	ErrWeakPassword       = errors.New("password must be at least 6 characters")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailNotVerified   = errors.New("email not verified")
	ErrInvalidToken       = errors.New("invalid or expired verification token")
	Err2FARequired        = errors.New("2FA code required")
	ErrInvalid2FACode     = errors.New("invalid 2FA code")
	Err2FANotEnabled      = errors.New("2FA is not enabled")
	Err2FAAlreadyEnabled  = errors.New("2FA is already enabled")
	ErrUserBanned         = errors.New("account is banned")
	ErrInvalidStatus      = errors.New("status must be 'active' or 'banned'")
	ErrCannotSelfModify   = errors.New("admins cannot modify their own account")
	ErrBioTooLong         = errors.New("bio must be at most 500 characters")
	ErrInvalidImage       = errors.New("file must be an image")
	ErrImageTooLarge      = errors.New("image must be at most 2 MB")
)

// IsValidRegistrationRole checks a role is allowed at registration (not admin)
func IsValidRegistrationRole(role string) bool {
	return role == RoleBuyer || role == RoleSeller
}
