package service

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/google/uuid"

	"product-service/internal/domain"
	"product-service/internal/repository"
)

// EventPublisher abstracts publishing product events.
type EventPublisher interface {
	PublishProductCreated(productID string, stock int) error
}

// ImageStorage abstracts uploading images (so the service doesn't depend on MinIO directly)
type ImageStorage interface {
	UploadImage(objectName string, reader io.Reader, size int64, contentType string) (string, error)
}

// SearchFilters holds optional product search filters
type SearchFilters struct {
	Query      string
	CategoryID string
	Brand      string
	Condition  string
	Gender     string
	MinPrice   int
	MaxPrice   int
}

type ProductSearch interface {
	IndexProduct(p domain.Product) error
	SearchProducts(f SearchFilters) ([]map[string]any, error)
}

// UserNameResolver fetches a user's display name by ID
type UserNameResolver interface {
	GetUserName(userID string) string
}

type ProductService struct {
	repo      repository.ProductRepository
	publisher EventPublisher
	storage   ImageStorage
	search    ProductSearch
	users     UserNameResolver
}

func NewProductService(repo repository.ProductRepository, publisher EventPublisher, storage ImageStorage, search ProductSearch, users UserNameResolver) *ProductService {
	return &ProductService{repo: repo, publisher: publisher, storage: storage, search: search, users: users}
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
	Gender       string
	Brand        string
	ModelCode    string
	Condition    string
	Material     string
	Color        string
	Size         string
	CategoryID   *string
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

	// Validate enums (default if empty)
	if in.Gender == "" {
		in.Gender = "unisex"
	}
	if !domain.IsValidGender(in.Gender) {
		return nil, domain.ErrInvalidInput
	}
	if in.Condition == "" {
		in.Condition = "good"
	}
	if !domain.IsValidCondition(in.Condition) {
		return nil, domain.ErrInvalidInput
	}
	// If a category is given, verify it exists
	if in.CategoryID != nil {
		if _, err := s.repo.GetCategory(ctx, *in.CategoryID); err != nil {
			return nil, err // ErrCategoryNotFound
		}
	}

	product := domain.Product{
		SellerID:    in.SellerID,
		Name:        name,
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

	created, err := s.repo.Create(ctx, product)
	if err != nil {
		return nil, err
	}

	// Publish product.created so Inventory registers its stock.
	// Best-effort: product creation still succeeds if the event fails.
	if err := s.publisher.PublishProductCreated(created.ID, created.Stock); err != nil {
		// A real system would use an outbox pattern for guaranteed delivery.
		_ = err
	}

	// Index in Elasticsearch for search (best-effort).
	// Fetch the seller's name so products are searchable by seller/influencer.
	created.SellerName = s.users.GetUserName(created.SellerID)
	if err := s.search.IndexProduct(*created); err != nil {
		_ = err
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
	Gender       string
	Brand        string
	ModelCode    string
	Condition    string
	Material     string
	Color        string
	Size         string
	CategoryID   *string
}

// Update updates a product (ownership enforced by the repository)
func (s *ProductService) Update(ctx context.Context, in UpdateInput) (*domain.Product, error) {
	if in.SellerID == "" {
		return nil, domain.ErrInvalidInput
	}

	if in.Gender == "" {
		in.Gender = "unisex"
	}
	if !domain.IsValidGender(in.Gender) {
		return nil, domain.ErrInvalidInput
	}
	if in.Condition == "" {
		in.Condition = "good"
	}
	if !domain.IsValidCondition(in.Condition) {
		return nil, domain.ErrInvalidInput
	}
	if in.CategoryID != nil {
		if _, err := s.repo.GetCategory(ctx, *in.CategoryID); err != nil {
			return nil, err
		}
	}

	product := domain.Product{
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

// SetImageURL updates a product's image URL (ownership enforced by the repo)
func (s *ProductService) SetImageURL(ctx context.Context, id, sellerID, imageURL string) (*domain.Product, error) {
	product, err := s.repo.UpdateImageURL(ctx, id, sellerID, imageURL)
	if err != nil {
		return nil, err
	}
	product.SetDisplayPrice()
	return product, nil
}

// AddProductImage uploads an image for a product (ownership + max enforced).
func (s *ProductService) AddProductImage(
	ctx context.Context,
	productID, sellerID, filename, contentType string,
	reader io.Reader,
	size int64,
) (*domain.ProductImage, error) {
	// Ownership check — only the product's seller can add images
	owner, err := s.repo.GetProductSeller(ctx, productID)
	if err != nil {
		return nil, err // ErrProductNotFound if missing
	}
	if owner != sellerID {
		return nil, domain.ErrProductNotFound // hide existence from non-owners
	}

	// Enforce the max images limit
	count, err := s.repo.CountImages(ctx, productID)
	if err != nil {
		return nil, err
	}
	if count >= domain.MaxImagesPerProduct {
		return nil, domain.ErrMaxImagesReached
	}

	// Upload to storage (object name namespaced by product)
	objectName := fmt.Sprintf("%s/%s-%s", productID, uuid.NewString(), filename)
	url, err := s.storage.UploadImage(objectName, reader, size, contentType)
	if err != nil {
		return nil, err
	}

	// Save the image record
	return s.repo.AddImage(ctx, productID, url)
}

// ListProductImages returns a product's image gallery
func (s *ProductService) ListProductImages(ctx context.Context, productID string) ([]domain.ProductImage, error) {
	return s.repo.ListImages(ctx, productID)
}

// DeleteProductImage removes an image (ownership enforced)
func (s *ProductService) DeleteProductImage(ctx context.Context, imageID, productID, sellerID string) error {
	owner, err := s.repo.GetProductSeller(ctx, productID)
	if err != nil {
		return err
	}
	if owner != sellerID {
		return domain.ErrProductNotFound
	}
	return s.repo.DeleteImage(ctx, imageID, productID)
}

// Search runs a full-text product search via Elasticsearch
func (s *ProductService) Search(ctx context.Context, f SearchFilters) ([]map[string]any, error) {
	return s.search.SearchProducts(f)
}
