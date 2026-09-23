package main

import (
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

const totpIssuer = "EcommerceMarketplace"

// TOTPManager handles TOTP secret generation and code verification
type TOTPManager struct{}

func NewTOTPManager() *TOTPManager {
	return &TOTPManager{}
}

// Generate creates a new TOTP secret for a user.
// Returns the secret (to store) and the otpauth URL (to render as a QR code).
func (m *TOTPManager) Generate(accountEmail string) (secret string, otpauthURL string, err error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      totpIssuer,
		AccountName: accountEmail,
	})
	if err != nil {
		return "", "", err
	}
	return key.Secret(), key.URL(), nil
}

// Verify checks whether a 6-digit code is valid for the given secret
func (m *TOTPManager) Verify(code, secret string) bool {
	return totp.Validate(code, secret)
}

// BuildKeyFromSecret reconstructs a key URL from a stored secret + email
// (useful if you need to re-render the QR later)
func (m *TOTPManager) BuildKeyFromSecret(secret, accountEmail string) (string, error) {
	key, err := otp.NewKeyFromURL(
		"otpauth://totp/" + totpIssuer + ":" + accountEmail +
			"?secret=" + secret + "&issuer=" + totpIssuer,
	)
	if err != nil {
		return "", err
	}
	return key.URL(), nil
}
