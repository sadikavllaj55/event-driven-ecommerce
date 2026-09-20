package main

import "golang.org/x/crypto/bcrypt"

// HashPassword hashes a plain-text password using bcrypt
func HashPassword(password string) (string, error) {
	// bcrypt automatically generates a salt and includes it in the hash.
	// DefaultCost (10) is a good balance of security and speed.
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword compares a plain-text password against a stored bcrypt hash.
// Returns nil if they match, an error otherwise.
func CheckPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
