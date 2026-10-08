package service

import (
	"context"
	"io"
	"log"
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

// PagedProducts is a paginated product response
type PagedProducts struct {
	Products []domain.Product `json:"products"`
	Total    int              `json:"total"`
	Page     int              `json:"page"`
	Limit    int              `json:"limit"`
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
	s.syncSearch(ctx, updated.ID) // keep the search copy in sync with edits
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

// List returns a page of products with pagination metadata
func (s *ProductService) List(ctx context.Context, page, limit int) (*PagedProducts, error) {
	page, limit, offset := normalizePage(page, limit)

	products, total, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		return nil, err
	}
	for i := range products {
		products[i].SetDisplayPrice()
	}

	return &PagedProducts{
		Products: products,
		Total:    total,
		Page:     page,
		Limit:    limit,
	}, nil
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
		s.syncSearch(ctx, id) // reload with images + seller name before indexing
	} else {
		_ = s.search.DeleteProduct(id)
	}

	product.SetDisplayPrice()
	return product, nil
}

// Reindex rebuilds the Elasticsearch index from the database (ops tool).
// Pages through ALL active products and caches seller names, so each
// seller is fetched once (avoids N+1 calls to the User Service).
func (s *ProductService) Reindex(ctx context.Context) (int, error) {
	const batchSize = 500
	sellerNames := make(map[string]string)
	count := 0
	var indexErr error

	for offset := 0; ; offset += batchSize {
		products, _, err := s.repo.List(ctx, batchSize, offset)
		if err != nil {
			return count, err
		}

		for i := range products {
			sellerID := products[i].SellerID
			name, cached := sellerNames[sellerID]
			if !cached {
				name = s.users.GetUserName(sellerID)
				sellerNames[sellerID] = name
			}
			products[i].SellerName = name

			if err := s.search.IndexProduct(products[i]); err != nil {
				log.Printf("Reindex product %s failed: %v", products[i].ID, err)
				if indexErr == nil {
					indexErr = err
				}
				continue // best-effort per product
			}
			count++
		}

		if len(products) < batchSize {
			break // last page
		}
	}
	return count, indexErr
}

// syncSearch re-indexes a product after a change that affects its search
// document (images, edits, reactivation). Best-effort: Postgres stays the
// source of truth. Non-active products are not re-added to the index.
func (s *ProductService) syncSearch(ctx context.Context, productID string) {
	p, err := s.repo.GetByID(ctx, productID) // includes images → fresh cover
	if err != nil {
		log.Printf("syncSearch: load product %s: %v", productID, err)
		return
	}
	if p.Status != "active" {
		return
	}
	p.SellerName = s.users.GetUserName(p.SellerID)
	if err := s.search.IndexProduct(*p); err != nil {
		log.Printf("syncSearch: index product %s: %v", productID, err)
	}
}

// normalizePage applies default/capped pagination values and returns the offset.
func normalizePage(page, limit int) (int, int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20 // default page size, capped at 100
	}
	return page, limit, (page - 1) * limit
}

// ListMine returns one page of a seller's own products (active + inactive)
func (s *ProductService) ListMine(ctx context.Context, sellerID string, page, limit int) (*PagedProducts, error) {
	if sellerID == "" {
		return nil, domain.ErrInvalidInput
	}
	page, limit, offset := normalizePage(page, limit)

	products, total, err := s.repo.ListBySeller(ctx, sellerID, false, limit, offset)
	if err != nil {
		return nil, err
	}
	for i := range products {
		products[i].SetDisplayPrice()
	}

	return &PagedProducts{
		Products: products,
		Total:    total,
		Page:     page,
		Limit:    limit,
	}, nil
}

// ListSellerPublic returns one page of a seller's ACTIVE products (public shop page)
func (s *ProductService) ListSellerPublic(ctx context.Context, sellerID string, page, limit int) (*PagedProducts, error) {
	if sellerID == "" {
		return nil, domain.ErrInvalidInput
	}
	page, limit, offset := normalizePage(page, limit)

	products, total, err := s.repo.ListBySeller(ctx, sellerID, true, limit, offset)
	if err != nil {
		return nil, err
	}
	for i := range products {
		products[i].SetDisplayPrice()
	}

	return &PagedProducts{
		Products: products,
		Total:    total,
		Page:     page,
		Limit:    limit,
	}, nil
}
