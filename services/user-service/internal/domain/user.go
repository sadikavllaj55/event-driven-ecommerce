package domain

import (
	"errors"
	"time"
)

// User represents a registered user
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // never serialized
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	Verified     bool      `json:"verified"`
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
)

// IsValidRegistrationRole checks a role is allowed at registration (not admin)
func IsValidRegistrationRole(role string) bool {
	return role == RoleBuyer || role == RoleSeller
}
