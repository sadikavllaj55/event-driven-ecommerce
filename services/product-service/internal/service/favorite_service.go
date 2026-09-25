package service

import (
	"context"

	"product-service/internal/domain"
)

// AddFavorite adds a product to the user's favorites (validates the product exists)
func (s *ProductService) AddFavorite(ctx context.Context, userID, productID string) error {
	// Verify the product exists (and isn't deleted)
	product, err := s.repo.GetByID(ctx, productID)
	if err != nil {
		return err // ErrProductNotFound
	}
	if product.Status == domain.StatusDeleted {
		return domain.ErrProductNotFound
	}
	return s.repo.AddFavorite(ctx, userID, productID)
}

// RemoveFavorite removes a product from the user's favorites
func (s *ProductService) RemoveFavorite(ctx context.Context, userID, productID string) error {
	return s.repo.RemoveFavorite(ctx, userID, productID)
}

// ListFavorites returns the user's favorited products (with display prices)
func (s *ProductService) ListFavorites(ctx context.Context, userID string) ([]domain.Product, error) {
	products, err := s.repo.ListFavorites(ctx, userID)
	if err != nil {
		return nil, err
	}
	for i := range products {
		products[i].SetDisplayPrice()
	}
	return products, nil
}
