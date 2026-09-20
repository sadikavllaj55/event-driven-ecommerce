package main

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Product represents a product in the catalog
type Product struct {
	ID          string    `json:"id"`
	SellerID    string    `json:"seller_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	PriceCents  int       `json:"price_cents"`
	Stock       int       `json:"stock"`
	ImageURL    string    `json:"image_url"`
	CreatedAt   time.Time `json:"created_at"`
}

// ErrProductNotFound is returned when a product lookup fails
var ErrProductNotFound = errors.New("product not found")

// DB wraps the connection pool
type DB struct {
	pool *pgxpool.Pool
}

// NewDB connects to PostgreSQL
func NewDB(connString string) (*DB, error) {
	pool, err := pgxpool.New(context.Background(), connString)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(context.Background()); err != nil {
		return nil, err
	}
	log.Println("Connected to PostgreSQL")
	return &DB{pool: pool}, nil
}

// CreateProduct inserts a new product owned by the given seller
func (db *DB) CreateProduct(sellerID, name, description string, priceCents, stock int, imageURL string) (*Product, error) {
	p := &Product{
		ID:          uuid.NewString(),
		SellerID:    sellerID,
		Name:        name,
		Description: description,
		PriceCents:  priceCents,
		Stock:       stock,
		ImageURL:    imageURL,
		CreatedAt:   time.Now().UTC(),
	}

	_, err := db.pool.Exec(context.Background(),
		`INSERT INTO products (id, seller_id, name, description, price_cents, stock, image_url, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		p.ID, p.SellerID, p.Name, p.Description, p.PriceCents, p.Stock, p.ImageURL, p.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return p, nil
}

// ListProducts returns all products (newest first)
func (db *DB) ListProducts() ([]Product, error) {
	rows, err := db.pool.Query(context.Background(),
		`SELECT id, seller_id, name, description, price_cents, stock, image_url, created_at
		 FROM products ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := []Product{}
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.SellerID, &p.Name, &p.Description,
			&p.PriceCents, &p.Stock, &p.ImageURL, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

// GetProduct returns a single product by ID
func (db *DB) GetProduct(id string) (*Product, error) {
	var p Product
	err := db.pool.QueryRow(context.Background(),
		`SELECT id, seller_id, name, description, price_cents, stock, image_url, created_at
		 FROM products WHERE id = $1`,
		id,
	).Scan(&p.ID, &p.SellerID, &p.Name, &p.Description,
		&p.PriceCents, &p.Stock, &p.ImageURL, &p.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrProductNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// UpdateProduct updates a product ONLY if it belongs to the given seller.
// Returns ErrProductNotFound if the product doesn't exist or isn't owned by the seller.
func (db *DB) UpdateProduct(id, sellerID, name, description string, priceCents, stock int, imageURL string) (*Product, error) {
	tag, err := db.pool.Exec(context.Background(),
		`UPDATE products
		 SET name = $1, description = $2, price_cents = $3, stock = $4, image_url = $5
		 WHERE id = $6 AND seller_id = $7`,
		name, description, priceCents, stock, imageURL, id, sellerID,
	)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		// Either the product doesn't exist OR it's not owned by this seller
		return nil, ErrProductNotFound
	}
	return db.GetProduct(id)
}

// DeleteProduct deletes a product ONLY if it belongs to the given seller
func (db *DB) DeleteProduct(id, sellerID string) error {
	tag, err := db.pool.Exec(context.Background(),
		`DELETE FROM products WHERE id = $1 AND seller_id = $2`,
		id, sellerID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrProductNotFound
	}
	return nil
}

// Close shuts down the connection pool
func (db *DB) Close() {
	db.pool.Close()
}
