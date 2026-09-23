package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"user-service/internal/domain"
)

// UserRepository defines the data-access contract for users
type UserRepository interface {
	Create(ctx context.Context, user domain.User, verificationToken string) error
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	GetByID(ctx context.Context, id string) (*domain.User, error)
	VerifyByToken(ctx context.Context, token string) error
	SetTOTPSecret(ctx context.Context, userID, secret string) error
	EnableTOTP(ctx context.Context, userID string) error
}

// PostgresUserRepository is the concrete Postgres implementation
type PostgresUserRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresUserRepository creates a new user repository
func NewPostgresUserRepository(pool *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{pool: pool}
}

// Create inserts a new (unverified) user with a verification token
func (r *PostgresUserRepository) Create(ctx context.Context, user domain.User, verificationToken string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO users (id, email, password_hash, name, role, verified, verification_token, created_at)
		 VALUES ($1, $2, $3, $4, $5, false, $6, $7)`,
		user.ID, user.Email, user.PasswordHash, user.Name, user.Role, verificationToken, user.CreatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.ErrEmailExists
		}
		return err
	}
	return nil
}

// GetByEmail looks up a user by email
func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	return r.getUser(ctx,
		`SELECT id, email, password_hash, name, role, verified, totp_secret, totp_enabled, created_at
		 FROM users WHERE email = $1`, email)
}

// GetByID looks up a user by ID
func (r *PostgresUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	return r.getUser(ctx,
		`SELECT id, email, password_hash, name, role, verified, totp_secret, totp_enabled, created_at
		 FROM users WHERE id = $1`, id)
}

// getUser is a shared helper for single-user lookups
func (r *PostgresUserRepository) getUser(ctx context.Context, query, arg string) (*domain.User, error) {
	var u domain.User
	var totpSecret *string // nullable in DB
	err := r.pool.QueryRow(ctx, query, arg).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.Verified,
		&totpSecret, &u.TOTPEnabled, &u.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	if totpSecret != nil {
		u.TOTPSecret = *totpSecret
	}
	return &u, nil
}

// VerifyByToken marks a user verified if the token matches (one-time use)
func (r *PostgresUserRepository) VerifyByToken(ctx context.Context, token string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE users SET verified = true, verification_token = NULL
		 WHERE verification_token = $1`,
		token,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrInvalidToken
	}
	return nil
}

// isUniqueViolation checks if an error is a Postgres unique constraint violation
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

// SetTOTPSecret stores a user's TOTP secret (during 2FA setup, before enabling)
func (r *PostgresUserRepository) SetTOTPSecret(ctx context.Context, userID, secret string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET totp_secret = $1 WHERE id = $2`,
		secret, userID,
	)
	return err
}

// EnableTOTP marks 2FA as enabled (after the user verifies a code)
func (r *PostgresUserRepository) EnableTOTP(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET totp_enabled = true WHERE id = $1`,
		userID,
	)
	return err
}
