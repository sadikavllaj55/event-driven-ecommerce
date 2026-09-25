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

// ProductStats returns product counts (for admin dashboard)
func (s *SettingsService) ProductStats(ctx context.Context) (map[string]int, error) {
	return s.repo.CountProducts(ctx)
}

// SellerStats returns a seller's own listings + favorites-received stats
func (s *SettingsService) SellerStats(ctx context.Context, sellerID string) (map[string]any, error) {
	listings, err := s.repo.CountSellerProducts(ctx, sellerID)
	if err != nil {
		return nil, err
	}
	favorites, err := s.repo.CountFavoritesReceived(ctx, sellerID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"listings":           listings,
		"favorites_received": favorites,
	}, nil
}
