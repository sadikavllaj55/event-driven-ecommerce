package main

import (
	"context"
	"errors"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DB wraps the connection pool
type DB struct {
	pool *pgxpool.Pool
}

// ErrInsufficientStock is returned when there aren't enough units
var ErrInsufficientStock = errors.New("insufficient stock")

// NewDB connects to PostgreSQL and returns a DB wrapper
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

// ReserveStock atomically reserves stock for a product.
// Returns the remaining quantity, or ErrInsufficientStock if not enough.
func (db *DB) ReserveStock(productID string, quantity int) (int, error) {
	ctx := context.Background()

	// Start a transaction so the check + update are atomic
	tx, err := db.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx) // rolls back if we don't commit

	// Lock the row and read current stock
	var available int
	err = tx.QueryRow(ctx,
		`SELECT available FROM stock WHERE product_id = $1 FOR UPDATE`,
		productID,
	).Scan(&available)

	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrInsufficientStock // unknown product = treat as no stock
	}
	if err != nil {
		return 0, err
	}

	// Not enough stock
	if available < quantity {
		return available, ErrInsufficientStock
	}

	// Decrement and save
	remaining := available - quantity
	_, err = tx.Exec(ctx,
		`UPDATE stock SET available = $1 WHERE product_id = $2`,
		remaining, productID,
	)
	if err != nil {
		return 0, err
	}

	// Commit the transaction
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return remaining, nil
}

// RestoreStock adds units back to a product's stock (compensating action)
func (db *DB) RestoreStock(productID string, quantity int) error {
	_, err := db.pool.Exec(context.Background(),
		`UPDATE stock SET available = available + $1 WHERE product_id = $2`,
		quantity, productID,
	)
	return err
}

// Close shuts down the connection pool
func (db *DB) Close() {
	db.pool.Close()
}
