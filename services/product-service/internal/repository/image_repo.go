package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"product-service/internal/domain"
)

// --- Product image gallery methods (part of PostgresProductRepository) ---

// AddImage adds an image to a product's gallery
func (r *PostgresProductRepository) AddImage(ctx context.Context, productID, imageURL string) (*domain.ProductImage, error) {
	img := &domain.ProductImage{
		ID:        uuid.NewString(),
		ProductID: productID,
		ImageURL:  imageURL,
	}

	count, err := r.CountImages(ctx, productID)
	if err != nil {
		return nil, err
	}
	img.Position = count

	err = r.pool.QueryRow(ctx,
		`INSERT INTO product_images (id, product_id, image_url, position)
		 VALUES ($1, $2, $3, $4)
		 RETURNING created_at`,
		img.ID, img.ProductID, img.ImageURL, img.Position,
	).Scan(&img.CreatedAt)
	if err != nil {
		return nil, err
	}
	return img, nil
}

// ListImages returns all images for a product, ordered by position
func (r *PostgresProductRepository) ListImages(ctx context.Context, productID string) ([]domain.ProductImage, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, product_id, image_url, position, created_at
		 FROM product_images WHERE product_id = $1 ORDER BY position`,
		productID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	images := []domain.ProductImage{}
	for rows.Next() {
		var img domain.ProductImage
		if err := rows.Scan(&img.ID, &img.ProductID, &img.ImageURL, &img.Position, &img.CreatedAt); err != nil {
			return nil, err
		}
		images = append(images, img)
	}
	return images, rows.Err()
}

// CountImages returns how many images a product has
func (r *PostgresProductRepository) CountImages(ctx context.Context, productID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM product_images WHERE product_id = $1`,
		productID,
	).Scan(&count)
	return count, err
}

// DeleteImage removes an image (scoped to its product)
func (r *PostgresProductRepository) DeleteImage(ctx context.Context, imageID, productID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM product_images WHERE id = $1 AND product_id = $2`,
		imageID, productID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrProductNotFound
	}
	return nil
}

// GetProductSeller returns the seller_id of a product (for ownership checks)
func (r *PostgresProductRepository) GetProductSeller(ctx context.Context, productID string) (string, error) {
	var sellerID string
	err := r.pool.QueryRow(ctx,
		`SELECT seller_id FROM products WHERE id = $1`,
		productID,
	).Scan(&sellerID)

	if errors.Is(err, pgx.ErrNoRows) {
		return "", domain.ErrProductNotFound
	}
	return sellerID, err
}
