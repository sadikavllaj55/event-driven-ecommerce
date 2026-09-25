package repository

import (
	"context"

	"product-service/internal/domain"
)

// --- Favorites methods (part of PostgresProductRepository) ---

// AddFavorite adds a product to a user's favorites (idempotent via composite PK)
func (r *PostgresProductRepository) AddFavorite(ctx context.Context, userID, productID string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO favorites (user_id, product_id)
		 VALUES ($1, $2)
		 ON CONFLICT (user_id, product_id) DO NOTHING`,
		userID, productID,
	)
	return err
}

// RemoveFavorite removes a product from a user's favorites
func (r *PostgresProductRepository) RemoveFavorite(ctx context.Context, userID, productID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM favorites WHERE user_id = $1 AND product_id = $2`,
		userID, productID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFavorited
	}
	return nil
}

// ListFavorites returns a user's favorited products (active only, newest first)
func (r *PostgresProductRepository) ListFavorites(ctx context.Context, userID string) ([]domain.Product, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+prefixedProductColumns("p")+`
		 FROM favorites f
		 JOIN products p ON p.id = f.product_id
		 WHERE f.user_id = $1 AND p.status = 'active'
		 ORDER BY f.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := []domain.Product{}
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}
