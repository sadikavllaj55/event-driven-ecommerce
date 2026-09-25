package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"order-service/internal/domain"
)

// OrderRepository defines the data-access contract (the interface).
// The service layer depends on THIS, not on the concrete database.
type OrderRepository interface {
	SaveOrder(ctx context.Context, order domain.Order) error
	UpdateOrderStatus(ctx context.Context, orderID, status string) error
	GetOrdersByBuyer(ctx context.Context, buyerID string) ([]domain.Order, error)
	GetOrderByID(ctx context.Context, orderID string) (*domain.Order, error)
	CountOrders(ctx context.Context) (map[string]int, error)
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

// GetOrdersByBuyer returns all orders for a buyer, each with its items
func (r *PostgresOrderRepository) GetOrdersByBuyer(ctx context.Context, buyerID string) ([]domain.Order, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, buyer_id, status, total_cents, created_at
		 FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC`,
		buyerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := []domain.Order{}
	for rows.Next() {
		var o domain.Order
		if err := rows.Scan(&o.ID, &o.BuyerID, &o.Status, &o.TotalCents, &o.CreatedAt); err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Load items for each order
	for i := range orders {
		items, err := r.getItems(ctx, orders[i].ID)
		if err != nil {
			return nil, err
		}
		orders[i].Items = items
	}

	return orders, nil
}

// GetOrderByID returns a single order with its items
func (r *PostgresOrderRepository) GetOrderByID(ctx context.Context, orderID string) (*domain.Order, error) {
	var o domain.Order
	err := r.pool.QueryRow(ctx,
		`SELECT id, buyer_id, status, total_cents, created_at
		 FROM orders WHERE id = $1`,
		orderID,
	).Scan(&o.ID, &o.BuyerID, &o.Status, &o.TotalCents, &o.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrOrderNotFound
	}
	if err != nil {
		return nil, err
	}

	items, err := r.getItems(ctx, o.ID)
	if err != nil {
		return nil, err
	}
	o.Items = items

	return &o, nil
}

// getItems loads all items for an order
func (r *PostgresOrderRepository) getItems(ctx context.Context, orderID string) ([]domain.OrderItem, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT product_id, quantity, price_cents, status
		 FROM order_items WHERE order_id = $1`,
		orderID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.OrderItem{}
	for rows.Next() {
		var it domain.OrderItem
		if err := rows.Scan(&it.ProductID, &it.Quantity, &it.PriceCents, &it.Status); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

// CountOrders returns order counts + revenue (for admin dashboard)
func (r *PostgresOrderRepository) CountOrders(ctx context.Context) (map[string]int, error) {
	stats := map[string]int{"total": 0, "paid": 0, "revenue_cents": 0}

	// Total + paid counts
	rows, err := r.pool.Query(ctx, `SELECT status, COUNT(*) FROM orders GROUP BY status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		stats["total"] += count
		if status == "paid" {
			stats["paid"] = count
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Revenue: sum of paid orders' totals
	var revenue int
	err = r.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(total_cents), 0) FROM orders WHERE status = 'paid'`,
	).Scan(&revenue)
	if err != nil {
		return nil, err
	}
	stats["revenue_cents"] = revenue

	return stats, nil
}
