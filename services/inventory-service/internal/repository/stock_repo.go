package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"inventory-service/internal/domain"
)

// StockRepository defines the data-access contract for stock
type StockRepository interface {
	ReserveItems(ctx context.Context, items []domain.Item) error
	RestoreItems(ctx context.Context, items []domain.Item) error
}

// PostgresStockRepository is the concrete Postgres implementation
type PostgresStockRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresStockRepository creates a new stock repository
func NewPostgresStockRepository(pool *pgxpool.Pool) *PostgresStockRepository {
	return &PostgresStockRepository{pool: pool}
}

// ReserveItems atomically reserves stock for MULTIPLE items (all-or-nothing).
// If any item has insufficient stock, the entire transaction rolls back.
func (r *PostgresStockRepository) ReserveItems(ctx context.Context, items []domain.Item) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, item := range items {
		var available int
		err = tx.QueryRow(ctx,
			`SELECT available FROM stock WHERE product_id = $1 FOR UPDATE`,
			item.ProductID,
		).Scan(&available)

		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrInsufficientStock
		}
		if err != nil {
			return err
		}

		if !canReserve(available, item.Quantity) {
			return domain.ErrInsufficientStock
		}

		_, err = tx.Exec(ctx,
			`UPDATE stock SET available = $1 WHERE product_id = $2`,
			available-item.Quantity, item.ProductID,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// RestoreItems adds stock back for multiple items (compensating action)
func (r *PostgresStockRepository) RestoreItems(ctx context.Context, items []domain.Item) error {
	tx, err := r.pool.Begin(ctx)
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

// canReserve is a small pure helper (kept here for the repo's use)
func canReserve(available, requested int) bool {
	return requested > 0 && available >= requested
}
