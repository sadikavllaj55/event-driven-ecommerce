package main

// BcryptHasher adapts the auth.go bcrypt functions to the
// service's PasswordHasher interface.
type BcryptHasher struct{}

func (BcryptHasher) Hash(password string) (string, error) {
	return HashPassword(password)
}

func (BcryptHasher) Check(password, hash string) error {
	return CheckPassword(password, hash)
}
