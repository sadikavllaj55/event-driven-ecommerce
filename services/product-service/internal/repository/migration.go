package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// EnsureOriginalPriceSchema adds the optional discount price column to both
// fresh and existing databases without rewriting existing product rows.
func EnsureOriginalPriceSchema(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price_cents INT`,
	); err != nil {
		return err
	}

	_, err := pool.Exec(ctx, `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_original_price_gt_price_check'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_original_price_gt_price_check
      CHECK (original_price_cents IS NULL OR original_price_cents > price_cents);
  END IF;
END $$;
`)
	return err
}
