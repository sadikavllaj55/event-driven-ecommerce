package main

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// User represents a registered user
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // "-" means never include in JSON responses
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

// ErrEmailExists is returned when trying to register an already-used email
var ErrEmailExists = errors.New("email already registered")

// ErrUserNotFound is returned when a user lookup fails
var ErrUserNotFound = errors.New("user not found")

// DB wraps the connection pool
type DB struct {
	pool *pgxpool.Pool
}

// NewDB connects to PostgreSQL
func NewDB(connString string) (*DB, error) {
	pool, err := pgxpool.New(context.Background(), connString)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(context.Background()); err != nil {
		return nil, err
	}
	log.Println("Connected to PostgreSQL")
	return &DB{pool: pool}, nil
}

// CreateUser inserts a new user. Returns ErrEmailExists if the email is taken.
func (db *DB) CreateUser(email, passwordHash, name, role, verificationToken string) (*User, error) {
	user := &User{
		ID:           uuid.NewString(),
		Email:        email,
		PasswordHash: passwordHash,
		Name:         name,
		Role:         role,
		CreatedAt:    time.Now().UTC(),
	}

	_, err := db.pool.Exec(context.Background(),
		`INSERT INTO users (id, email, password_hash, name, role, verified, verification_token, created_at)
		 VALUES ($1, $2, $3, $4, $5, false, $6, $7)`,
		user.ID, user.Email, user.PasswordHash, user.Name, user.Role, verificationToken, user.CreatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrEmailExists
		}
		return nil, err
	}

	return user, nil
}

// GetUserByEmail looks up a user by email (used for login)
func (db *DB) GetUserByEmail(email string) (*User, error) {
	var u User
	err := db.pool.QueryRow(context.Background(),
		`SELECT id, email, password_hash, name, role, created_at
		 FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// GetUserByID looks up a user by ID (used for profile)
func (db *DB) GetUserByID(id string) (*User, error) {
	var u User
	err := db.pool.QueryRow(context.Background(),
		`SELECT id, email, password_hash, name, role, created_at
		 FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// VerifyUser marks a user as verified if the token matches.
// Returns ErrUserNotFound if no user has that token.
func (db *DB) VerifyUser(token string) error {
	tag, err := db.pool.Exec(context.Background(),
		`UPDATE users SET verified = true, verification_token = NULL
		 WHERE verification_token = $1`,
		token,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

// Close shuts down the connection pool
func (db *DB) Close() {
	db.pool.Close()
}

// isUniqueViolation checks if an error is a Postgres unique constraint violation
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}
