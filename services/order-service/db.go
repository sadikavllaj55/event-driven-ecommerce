package main

import (
	"context"
	"log"

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

// SaveOrder inserts a new order into the database
func (db *DB) SaveOrder(order Order) error {
	_, err := db.pool.Exec(context.Background(),
		`INSERT INTO orders (id, product_id, quantity, status, created_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		order.ID, order.ProductID, order.Quantity, order.Status, order.CreatedAt,
	)
	return err
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
