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
	Verified     bool      `json:"verified"`
	TOTPSecret   string    `json:"-"` // never expose the secret
	TOTPEnabled  bool      `json:"totp_enabled"`
	CreatedAt    time.Time `json:"created_at"`
}

// Valid roles
const (
	RoleBuyer  = "buyer"
	RoleSeller = "seller"
	RoleAdmin  = "admin"
)

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
)

// IsValidRegistrationRole checks a role is allowed at registration (not admin)
func IsValidRegistrationRole(role string) bool {
	return role == RoleBuyer || role == RoleSeller
}
