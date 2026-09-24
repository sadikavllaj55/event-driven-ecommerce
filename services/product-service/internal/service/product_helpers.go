package service

import (
	"context"
	"strings"

	"product-service/internal/domain"
)

// ProductInput is the shared input for creating/updating a product.
// Price is in DOLLARS (e.g. 49.99) — converted to cents internally.
type ProductInput struct {
	ID           string // set only for updates
	SellerID     string
	Name         string
	Description  string
	PriceDollars float64
	Stock        int
	ImageURL     string
	Gender       string
	Brand        string
	ModelCode    string
	Condition    string
	Material     string
	Color        string
	Size         string
	CategoryID   *string
}

// normalizeAndValidate applies defaults, validates enums, and checks the category.
// Shared by Create and Update (single source of truth).
func (s *ProductService) normalizeAndValidate(ctx context.Context, in *ProductInput) error {
	in.Name = strings.TrimSpace(in.Name)
	if in.SellerID == "" {
		return domain.ErrInvalidInput
	}
	if in.PriceDollars < 0 || in.Stock < 0 {
		return domain.ErrInvalidInput
	}

	// Enum defaults + validation
	if in.Gender == "" {
		in.Gender = "unisex"
	}
	if !domain.IsValidGender(in.Gender) {
		return domain.ErrInvalidInput
	}
	if in.Condition == "" {
		in.Condition = "good"
	}
	if !domain.IsValidCondition(in.Condition) {
		return domain.ErrInvalidInput
	}

	// Verify the category exists (if provided)
	if in.CategoryID != nil {
		if _, err := s.repo.GetCategory(ctx, *in.CategoryID); err != nil {
			return err // ErrCategoryNotFound
		}
	}
	return nil
}

// toDomain maps a validated input to a domain.Product
func (in ProductInput) toDomain() domain.Product {
	return domain.Product{
		ID:          in.ID,
		SellerID:    in.SellerID,
		Name:        in.Name,
		Description: in.Description,
		PriceCents:  domain.DollarsToCents(in.PriceDollars),
		Stock:       in.Stock,
		ImageURL:    in.ImageURL,
		Gender:      in.Gender,
		Brand:       in.Brand,
		ModelCode:   in.ModelCode,
		Condition:   in.Condition,
		Material:    in.Material,
		Color:       in.Color,
		Size:        in.Size,
		CategoryID:  in.CategoryID,
	}
}
