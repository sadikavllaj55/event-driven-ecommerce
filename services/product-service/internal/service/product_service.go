package service

import (
	"context"
	"io"
	"product-service/internal/domain"
	"product-service/internal/repository"
)

// --- Dependencies (interfaces for dependency inversion) ---

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

// ProductSearch abstracts indexing and searching products
type ProductSearch interface {
	IndexProduct(p domain.Product) error
	SearchProducts(f SearchFilters) ([]map[string]any, error)
	DeleteProduct(productID string) error
}

// UserNameResolver fetches a user's display name by ID
type UserNameResolver interface {
	GetUserName(userID string) string
}

// ProductService holds the business logic for products
type ProductService struct {
	repo      repository.ProductRepository
	publisher EventPublisher
	storage   ImageStorage
	search    ProductSearch
	users     UserNameResolver
}

func NewProductService(
	repo repository.ProductRepository,
	publisher EventPublisher,
	storage ImageStorage,
	search ProductSearch,
	users UserNameResolver,
) *ProductService {
	return &ProductService{repo: repo, publisher: publisher, storage: storage, search: search, users: users}
}

// --- Core CRUD ---

// Create validates and creates a product
func (s *ProductService) Create(ctx context.Context, in ProductInput) (*domain.Product, error) {
	if err := s.normalizeAndValidate(ctx, &in); err != nil {
		return nil, err
	}
	if in.Name == "" {
		return nil, domain.ErrInvalidInput
	}

	created, err := s.repo.Create(ctx, in.toDomain())
	if err != nil {
		return nil, err
	}

	// Best-effort side effects (a real system would use an outbox for guarantees)
	s.afterCreate(created)

	created.SetDisplayPrice()
	return created, nil
}

// Update updates a product (ownership enforced by the repository)
func (s *ProductService) Update(ctx context.Context, in ProductInput) (*domain.Product, error) {
	if err := s.normalizeAndValidate(ctx, &in); err != nil {
		return nil, err
	}

	updated, err := s.repo.Update(ctx, in.toDomain())
	if err != nil {
		return nil, err
	}
	updated.SetDisplayPrice()
	return updated, nil
}

// afterCreate runs best-effort post-create side effects (events + search indexing)
func (s *ProductService) afterCreate(p *domain.Product) {
	// Notify Inventory to register stock
	_ = s.publisher.PublishProductCreated(p.ID, p.Stock)

	// Index for search, including the seller name (for influencer search)
	p.SellerName = s.users.GetUserName(p.SellerID)
	_ = s.search.IndexProduct(*p)
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

// Delete removes a product (ownership enforced by the repository)
func (s *ProductService) Delete(ctx context.Context, id, sellerID string) error {
	if sellerID == "" {
		return domain.ErrInvalidInput
	}
	if err := s.repo.Delete(ctx, id, sellerID); err != nil {
		return err
	}
	// Remove from search index (best-effort)
	_ = s.search.DeleteProduct(id)
	return nil
}

// Search runs a full-text product search via Elasticsearch
func (s *ProductService) Search(ctx context.Context, f SearchFilters) ([]map[string]any, error) {
	return s.search.SearchProducts(f)
}

// SetStatus changes a product's status (active/inactive) — ownership enforced.
// Re-indexes or de-indexes in search depending on the new status.
func (s *ProductService) SetStatus(ctx context.Context, id, sellerID, status string) (*domain.Product, error) {
	if !domain.IsValidStatusChange(status) {
		return nil, domain.ErrInvalidStatus
	}

	product, err := s.repo.UpdateStatus(ctx, id, sellerID, status)
	if err != nil {
		return nil, err
	}

	// Keep the search index in sync: active = searchable, inactive = removed
	if status == domain.StatusActive {
		product.SellerName = s.users.GetUserName(product.SellerID)
		_ = s.search.IndexProduct(*product)
	} else {
		_ = s.search.DeleteProduct(id)
	}

	product.SetDisplayPrice()
	return product, nil
}
