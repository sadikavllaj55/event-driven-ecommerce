package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"product-service/internal/domain"
)

// ProductRepository defines the data-access contract
type ProductRepository interface {
	Create(ctx context.Context, p domain.Product) (*domain.Product, error)
	List(ctx context.Context) ([]domain.Product, error)
	GetByID(ctx context.Context, id string) (*domain.Product, error)
	Update(ctx context.Context, p domain.Product) (*domain.Product, error)
	UpdateImageURL(ctx context.Context, id, sellerID, imageURL string) (*domain.Product, error)
	Delete(ctx context.Context, id, sellerID string) error

	// Image gallery
	AddImage(ctx context.Context, productID, imageURL string) (*domain.ProductImage, error)
	ListImages(ctx context.Context, productID string) ([]domain.ProductImage, error)
	CountImages(ctx context.Context, productID string) (int, error)
	DeleteImage(ctx context.Context, imageID, productID string) error
	GetProductSeller(ctx context.Context, productID string) (string, error)
	GetCategory(ctx context.Context, id string) (*domain.Category, error)
}

// PostgresProductRepository is the concrete Postgres implementation
type PostgresProductRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresProductRepository(pool *pgxpool.Pool) *PostgresProductRepository {
	return &PostgresProductRepository{pool: pool}
}

// Create inserts a new product
func (r *PostgresProductRepository) Create(ctx context.Context, p domain.Product) (*domain.Product, error) {
	p.ID = uuid.NewString()

	_, err := r.pool.Exec(ctx,
		`INSERT INTO products
		 (id, seller_id, name, description, price_cents, stock, image_url,
		  gender, brand, model_code, condition, material, color, size, category_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
		p.ID, p.SellerID, p.Name, p.Description, p.PriceCents, p.Stock, p.ImageURL,
		p.Gender, p.Brand, p.ModelCode, p.Condition, p.Material, p.Color, p.Size, p.CategoryID,
	)

	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, p.ID)
}

// List returns all products (newest first)
func (r *PostgresProductRepository) List(ctx context.Context) ([]domain.Product, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, seller_id, name, description, price_cents, stock, image_url,
		        gender, brand, model_code, condition, material, color, size, category_id, created_at
		 FROM products ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := []domain.Product{}
	for rows.Next() {
		var p domain.Product
		if err := rows.Scan(&p.ID, &p.SellerID, &p.Name, &p.Description,
			&p.PriceCents, &p.Stock, &p.ImageURL,
			&p.Gender, &p.Brand, &p.ModelCode, &p.Condition, &p.Material, &p.Color, &p.Size,
			&p.CategoryID, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

// GetByID returns a single product
func (r *PostgresProductRepository) GetByID(ctx context.Context, id string) (*domain.Product, error) {
	var p domain.Product
	err := r.pool.QueryRow(ctx,
		`SELECT id, seller_id, name, description, price_cents, stock, image_url,
		        gender, brand, model_code, condition, material, color, size, category_id, created_at
		 FROM products WHERE id = $1`,
		id,
	).Scan(&p.ID, &p.SellerID, &p.Name, &p.Description,
		&p.PriceCents, &p.Stock, &p.ImageURL,
		&p.Gender, &p.Brand, &p.ModelCode, &p.Condition, &p.Material, &p.Color, &p.Size,
		&p.CategoryID, &p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrProductNotFound
	}
	if err != nil {
		return nil, err
	}

	// Load the product's image gallery
	images, err := r.ListImages(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	p.Images = images

	return &p, nil
}

// Update updates a product ONLY if it belongs to the given seller
func (r *PostgresProductRepository) Update(ctx context.Context, p domain.Product) (*domain.Product, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE products
		 SET name = $1, description = $2, price_cents = $3, stock = $4, image_url = $5,
		     gender = $6, brand = $7, model_code = $8, condition = $9,
		     material = $10, color = $11, size = $12, category_id = $13
		 WHERE id = $14 AND seller_id = $15`,
		p.Name, p.Description, p.PriceCents, p.Stock, p.ImageURL,
		p.Gender, p.Brand, p.ModelCode, p.Condition, p.Material, p.Color, p.Size, p.CategoryID,
		p.ID, p.SellerID,
	)

	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrProductNotFound // doesn't exist or not owned
	}
	return r.GetByID(ctx, p.ID)
}

// UpdateImageURL sets a product's image URL, ONLY if it belongs to the seller
func (r *PostgresProductRepository) UpdateImageURL(ctx context.Context, id, sellerID, imageURL string) (*domain.Product, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE products SET image_url = $1 WHERE id = $2 AND seller_id = $3`,
		imageURL, id, sellerID,
	)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrProductNotFound // doesn't exist or not owned
	}
	return r.GetByID(ctx, id)
}

// Delete removes a product ONLY if it belongs to the given seller
func (r *PostgresProductRepository) Delete(ctx context.Context, id, sellerID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM products WHERE id = $1 AND seller_id = $2`,
		id, sellerID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrProductNotFound
	}
	return nil
}
