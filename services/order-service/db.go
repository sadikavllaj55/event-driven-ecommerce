package main

import (
	"context"
	"log"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DB wraps the connection pool
type DB struct {
	pool *pgxpool.Pool
}

// NewDB connects to PostgreSQL and returns a DB wrapper
func NewDB(connString string) (*DB, error) {
	pool, err := pgxpool.New(context.Background(), connString)
	if err != nil {
		return nil, err
	}

	// Verify the connection works
	if err := pool.Ping(context.Background()); err != nil {
		return nil, err
	}

	log.Println("Connected to PostgreSQL")
	return &DB{pool: pool}, nil
}

// SaveOrder inserts a new order and all its items in a single transaction
func (db *DB) SaveOrder(order Order) error {
	ctx := context.Background()

	tx, err := db.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // rolls back if we don't commit

	// Insert the order
	_, err = tx.Exec(ctx,
		`INSERT INTO orders (id, buyer_id, status, total_cents, created_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		order.ID, nullIfEmpty(order.BuyerID), order.Status, order.TotalCents, order.CreatedAt,
	)
	if err != nil {
		return err
	}

	// Insert each item
	for _, item := range order.Items {
		_, err = tx.Exec(ctx,
			`INSERT INTO order_items (id, order_id, product_id, quantity, price_cents, status)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			uuid.NewString(), order.ID, item.ProductID, item.Quantity, item.PriceCents, item.Status,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// nullIfEmpty returns nil for empty strings (so buyer_id can be NULL)
func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// UpdateOrderStatus updates the status of an existing order
func (db *DB) UpdateOrderStatus(orderID, status string) error {
	_, err := db.pool.Exec(context.Background(),
		`UPDATE orders SET status = $1 WHERE id = $2`,
		status, orderID,
	)
	return err
}

// Ping checks if the database is reachable
func (db *DB) Ping() error {
	return db.pool.Ping(context.Background())
}

// Close shuts down the connection pool
func (db *DB) Close() {
	db.pool.Close()
}
