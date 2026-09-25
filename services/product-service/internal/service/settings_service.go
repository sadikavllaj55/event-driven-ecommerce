package service

import (
	"context"
	"strconv"

	"product-service/internal/domain"
	"product-service/internal/repository"
)

// SettingsService manages admin-configurable settings
type SettingsService struct {
	repo repository.ProductRepository
}

func NewSettingsService(repo repository.ProductRepository) *SettingsService {
	return &SettingsService{repo: repo}
}

// List returns all settings
func (s *SettingsService) List(ctx context.Context) ([]domain.Setting, error) {
	return s.repo.ListSettings(ctx)
}

// Set creates or updates a setting
func (s *SettingsService) Set(ctx context.Context, key, value string) (*domain.Setting, error) {
	if key == "" || value == "" {
		return nil, domain.ErrInvalidInput
	}
	return s.repo.UpsertSetting(ctx, key, value)
}

// GetIntSetting returns a setting as an int, falling back to a default if missing/invalid.
// Used by the product service to read config like max_images_per_product.
func GetIntSetting(ctx context.Context, repo repository.ProductRepository, key string, fallback int) int {
	value, err := repo.GetSetting(ctx, key)
	if err != nil {
		return fallback
	}
	n, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return n
}
