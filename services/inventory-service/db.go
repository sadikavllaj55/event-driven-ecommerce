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

// Item represents a product + quantity to reserve/restore
type Item struct {
	ProductID string
	Quantity  int
}

// ReserveItems atomically reserves stock for MULTIPLE items (all-or-nothing).
// If any item has insufficient stock, the entire transaction rolls back
// and ErrInsufficientStock is returned.
func (db *DB) ReserveItems(items []Item) error {
	ctx := context.Background()

	tx, err := db.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // rolls back automatically unless we commit

	for _, item := range items {
		// Lock the row and read current stock
		var available int
		err = tx.QueryRow(ctx,
			`SELECT available FROM stock WHERE product_id = $1 FOR UPDATE`,
			item.ProductID,
		).Scan(&available)

		if errors.Is(err, pgx.ErrNoRows) {
			return ErrInsufficientStock // unknown product = no stock
		}
		if err != nil {
			return err
		}

		// Check if we can reserve this item
		if !CanReserve(available, item.Quantity) {
			// Not enough for this item -> whole transaction rolls back (defer)
			return ErrInsufficientStock
		}

		// Decrement
		remaining := RemainingAfterReserve(available, item.Quantity)
		_, err = tx.Exec(ctx,
			`UPDATE stock SET available = $1 WHERE product_id = $2`,
			remaining, item.ProductID,
		)
		if err != nil {
			return err
		}
	}

	// All items reserved successfully -> commit everything at once
	return tx.Commit(ctx)
}

// RestoreItems adds stock back for multiple items (compensating action)
func (db *DB) RestoreItems(items []Item) error {
	ctx := context.Background()

	tx, err := db.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, item := range items {
		_, err = tx.Exec(ctx,
			`UPDATE stock SET available = available + $1 WHERE product_id = $2`,
			item.Quantity, item.ProductID,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
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
