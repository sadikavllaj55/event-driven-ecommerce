package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"order-service/internal/domain"
)

// OrderRepository defines the data-access contract (the interface).
// The service layer depends on THIS, not on the concrete database.
type OrderRepository interface {
	SaveOrder(ctx context.Context, order domain.Order) error
	UpdateOrderStatus(ctx context.Context, orderID, status string) error
}

// PostgresOrderRepository is the concrete Postgres implementation
type PostgresOrderRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresOrderRepository creates a new repository backed by Postgres
func NewPostgresOrderRepository(pool *pgxpool.Pool) *PostgresOrderRepository {
	return &PostgresOrderRepository{pool: pool}
}

// SaveOrder inserts an order and all its items in a single transaction
func (r *PostgresOrderRepository) SaveOrder(ctx context.Context, order domain.Order) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		`INSERT INTO orders (id, buyer_id, status, total_cents, created_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		order.ID, nullIfEmpty(order.BuyerID), order.Status, order.TotalCents, order.CreatedAt,
	)
	if err != nil {
		return err
	}

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

// UpdateOrderStatus updates the overall order status
func (r *PostgresOrderRepository) UpdateOrderStatus(ctx context.Context, orderID, status string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE orders SET status = $1 WHERE id = $2`,
		status, orderID,
	)
	return err
}

// nullIfEmpty returns nil for empty strings (so buyer_id can be NULL)
func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
