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
	Delete(ctx context.Context, id, sellerID string) error
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
		`INSERT INTO products (id, seller_id, name, description, price_cents, stock, image_url)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		p.ID, p.SellerID, p.Name, p.Description, p.PriceCents, p.Stock, p.ImageURL,
	)
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, p.ID)
}

// List returns all products (newest first)
func (r *PostgresProductRepository) List(ctx context.Context) ([]domain.Product, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, seller_id, name, description, price_cents, stock, image_url, created_at
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
			&p.PriceCents, &p.Stock, &p.ImageURL, &p.CreatedAt); err != nil {
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
		`SELECT id, seller_id, name, description, price_cents, stock, image_url, created_at
		 FROM products WHERE id = $1`,
		id,
	).Scan(&p.ID, &p.SellerID, &p.Name, &p.Description,
		&p.PriceCents, &p.Stock, &p.ImageURL, &p.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrProductNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// Update updates a product ONLY if it belongs to the given seller
func (r *PostgresProductRepository) Update(ctx context.Context, p domain.Product) (*domain.Product, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE products
		 SET name = $1, description = $2, price_cents = $3, stock = $4, image_url = $5
		 WHERE id = $6 AND seller_id = $7`,
		p.Name, p.Description, p.PriceCents, p.Stock, p.ImageURL, p.ID, p.SellerID,
	)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrProductNotFound // doesn't exist or not owned
	}
	return r.GetByID(ctx, p.ID)
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
