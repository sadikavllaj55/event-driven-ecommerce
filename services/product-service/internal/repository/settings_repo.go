package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"product-service/internal/domain"
)

// --- Settings methods (part of PostgresProductRepository) ---

// GetSetting returns a single setting's value by key
func (r *PostgresProductRepository) GetSetting(ctx context.Context, key string) (string, error) {
	var value string
	err := r.pool.QueryRow(ctx,
		`SELECT value FROM settings WHERE key = $1`, key,
	).Scan(&value)

	if errors.Is(err, pgx.ErrNoRows) {
		return "", domain.ErrSettingNotFound
	}
	return value, err
}

// ListSettings returns all settings
func (r *PostgresProductRepository) ListSettings(ctx context.Context) ([]domain.Setting, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT key, value, updated_at FROM settings ORDER BY key`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settings := []domain.Setting{}
	for rows.Next() {
		var s domain.Setting
		if err := rows.Scan(&s.Key, &s.Value, &s.UpdatedAt); err != nil {
			return nil, err
		}
		settings = append(settings, s)
	}
	return settings, rows.Err()
}

// UpsertSetting creates or updates a setting
func (r *PostgresProductRepository) UpsertSetting(ctx context.Context, key, value string) (*domain.Setting, error) {
	var s domain.Setting
	err := r.pool.QueryRow(ctx,
		`INSERT INTO settings (key, value, updated_at)
		 VALUES ($1, $2, now())
		 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
		 RETURNING key, value, updated_at`,
		key, value,
	).Scan(&s.Key, &s.Value, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}
