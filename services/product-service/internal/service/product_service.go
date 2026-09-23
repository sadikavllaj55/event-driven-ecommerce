package service

import (
	"context"
	"strings"

	"product-service/internal/domain"
	"product-service/internal/repository"
)

// ProductService holds the business logic for products
type ProductService struct {
	repo repository.ProductRepository
}

func NewProductService(repo repository.ProductRepository) *ProductService {
	return &ProductService{repo: repo}
}

// CreateInput is the business input for creating a product.
// Price is in DOLLARS (e.g. 49.99) — converted to cents internally.
type CreateInput struct {
	SellerID     string
	Name         string
	Description  string
	PriceDollars float64
	Stock        int
	ImageURL     string
}

// Create validates and creates a product, converting dollars to cents
func (s *ProductService) Create(ctx context.Context, in CreateInput) (*domain.Product, error) {
	name := strings.TrimSpace(in.Name)
	if in.SellerID == "" || name == "" {
		return nil, domain.ErrInvalidInput
	}
	if in.PriceDollars < 0 || in.Stock < 0 {
		return nil, domain.ErrInvalidInput
	}

	product := domain.Product{
		SellerID:    in.SellerID,
		Name:        name,
		Description: in.Description,
		PriceCents:  domain.DollarsToCents(in.PriceDollars), // convert here
		Stock:       in.Stock,
		ImageURL:    in.ImageURL,
	}

	created, err := s.repo.Create(ctx, product)
	if err != nil {
		return nil, err
	}
	created.SetDisplayPrice()
	return created, nil
}

// List returns all products with display prices set
func (s *ProductService) List(ctx context.Context) ([]domain.Product, error) {
	products, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	for i := range products {
		products[i].SetDisplayPrice()
	}
	return products, nil
}

// Get returns a single product with display price set
func (s *ProductService) Get(ctx context.Context, id string) (*domain.Product, error) {
	product, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	product.SetDisplayPrice()
	return product, nil
}

// UpdateInput is the business input for updating a product
type UpdateInput struct {
	ID           string
	SellerID     string
	Name         string
	Description  string
	PriceDollars float64
	Stock        int
	ImageURL     string
}

// Update updates a product (ownership enforced by the repository)
func (s *ProductService) Update(ctx context.Context, in UpdateInput) (*domain.Product, error) {
	if in.SellerID == "" {
		return nil, domain.ErrInvalidInput
	}

	product := domain.Product{
		ID:          in.ID,
		SellerID:    in.SellerID,
		Name:        in.Name,
		Description: in.Description,
		PriceCents:  domain.DollarsToCents(in.PriceDollars),
		Stock:       in.Stock,
		ImageURL:    in.ImageURL,
	}

	updated, err := s.repo.Update(ctx, product)
	if err != nil {
		return nil, err
	}
	updated.SetDisplayPrice()
	return updated, nil
}

// Delete removes a product (ownership enforced by the repository)
func (s *ProductService) Delete(ctx context.Context, id, sellerID string) error {
	if sellerID == "" {
		return domain.ErrInvalidInput
	}
	return s.repo.Delete(ctx, id, sellerID)
}
