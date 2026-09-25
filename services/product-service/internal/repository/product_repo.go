package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"product-service/internal/domain"
)

// ProductRepository defines the data-access contract
type ProductRepository interface {
	Create(ctx context.Context, p domain.Product) (*domain.Product, error)
	List(ctx context.Context) ([]domain.Product, error)
	ListBySeller(ctx context.Context, sellerID string) ([]domain.Product, error)
	GetByID(ctx context.Context, id string) (*domain.Product, error)
	Update(ctx context.Context, p domain.Product) (*domain.Product, error)
	UpdateImageURL(ctx context.Context, id, sellerID, imageURL string) (*domain.Product, error)
	UpdateStatus(ctx context.Context, id, sellerID, status string) (*domain.Product, error)
	Delete(ctx context.Context, id, sellerID string) error

	// Image gallery
	AddImage(ctx context.Context, productID, imageURL string) (*domain.ProductImage, error)
	ListImages(ctx context.Context, productID string) ([]domain.ProductImage, error)
	CountImages(ctx context.Context, productID string) (int, error)
	DeleteImage(ctx context.Context, imageID, productID string) error
	GetProductSeller(ctx context.Context, productID string) (string, error)
	GetCategory(ctx context.Context, id string) (*domain.Category, error)

	// Favorites
	AddFavorite(ctx context.Context, userID, productID string) error
	RemoveFavorite(ctx context.Context, userID, productID string) error
	ListFavorites(ctx context.Context, userID string) ([]domain.Product, error)

	// Settings
	GetSetting(ctx context.Context, key string) (string, error)
	ListSettings(ctx context.Context) ([]domain.Setting, error)
	UpsertSetting(ctx context.Context, key, value string) (*domain.Setting, error)

	CountProducts(ctx context.Context) (map[string]int, error)
	CountSellerProducts(ctx context.Context, sellerID string) (map[string]int, error)
	CountFavoritesReceived(ctx context.Context, sellerID string) (int, error)
}

// PostgresProductRepository is the concrete Postgres implementation
type PostgresProductRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresProductRepository(pool *pgxpool.Pool) *PostgresProductRepository {
	return &PostgresProductRepository{pool: pool}
}

// productColumns is the single source of truth for product SELECT column order.
// It MUST match the scan order in scanProduct.
const productColumns = `id, seller_id, name, description, price_cents, stock, image_url,
	gender, brand, model_code, condition, material, color, size, category_id, status, created_at`

// prefixedProductColumns returns the product columns prefixed with a table alias
// (for JOIN queries where column names could be ambiguous)
func prefixedProductColumns(alias string) string {
	cols := []string{
		"id", "seller_id", "name", "description", "price_cents", "stock", "image_url",
		"gender", "brand", "model_code", "condition", "material", "color", "size",
		"category_id", "status", "created_at",
	}
	prefixed := make([]string, len(cols))
	for i, c := range cols {
		prefixed[i] = alias + "." + c
	}
	return strings.Join(prefixed, ", ")
}

// rowScanner is satisfied by both pgx.Row and pgx.Rows
type rowScanner interface {
	Scan(dest ...any) error
}

// scanProduct scans a single product row (single source of truth for scan order).
func scanProduct(row rowScanner) (domain.Product, error) {
	var p domain.Product
	err := row.Scan(
		&p.ID, &p.SellerID, &p.Name, &p.Description, &p.PriceCents, &p.Stock, &p.ImageURL,
		&p.Gender, &p.Brand, &p.ModelCode, &p.Condition, &p.Material, &p.Color, &p.Size,
		&p.CategoryID, &p.Status, &p.CreatedAt,
	)
	return p, err
}

// Create inserts a new product and returns it (with images loaded)
func (r *PostgresProductRepository) Create(ctx context.Context, p domain.Product) (*domain.Product, error) {
	p.ID = uuid.NewString()

	_, err := r.pool.Exec(ctx,
		`INSERT INTO products
		 (id, seller_id, name, description, price_cents, stock, image_url,
		  gender, brand, model_code, condition, material, color, size, category_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
		p.ID, p.SellerID, p.Name, p.Description, p.PriceCents, p.Stock, p.ImageURL,
		p.Gender, p.Brand, p.ModelCode, p.Condition, p.Material, p.Color, p.Size, p.CategoryID,
	)
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, p.ID)
}

// List returns all products (newest first)
func (r *PostgresProductRepository) List(ctx context.Context) ([]domain.Product, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+productColumns+` FROM products WHERE status = 'active' ORDER BY created_at DESC`,
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

// GetByID returns a single product with its image gallery
func (r *PostgresProductRepository) GetByID(ctx context.Context, id string) (*domain.Product, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+productColumns+` FROM products WHERE id = $1`, id,
	)
	p, err := scanProduct(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrProductNotFound
	}
	if err != nil {
		return nil, err
	}

	images, err := r.ListImages(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	p.Images = images
	return &p, nil
}

// Update updates a product ONLY if it belongs to the given seller
func (r *PostgresProductRepository) Update(ctx context.Context, p domain.Product) (*domain.Product, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE products
		 SET name = $1, description = $2, price_cents = $3, stock = $4, image_url = $5,
		     gender = $6, brand = $7, model_code = $8, condition = $9,
		     material = $10, color = $11, size = $12, category_id = $13
		 WHERE id = $14 AND seller_id = $15`,
		p.Name, p.Description, p.PriceCents, p.Stock, p.ImageURL,
		p.Gender, p.Brand, p.ModelCode, p.Condition, p.Material, p.Color, p.Size, p.CategoryID,
		p.ID, p.SellerID,
	)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrProductNotFound
	}
	return r.GetByID(ctx, p.ID)
}

// UpdateImageURL sets a product's image URL, ONLY if it belongs to the seller
func (r *PostgresProductRepository) UpdateImageURL(ctx context.Context, id, sellerID, imageURL string) (*domain.Product, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE products SET image_url = $1 WHERE id = $2 AND seller_id = $3`,
		imageURL, id, sellerID,
	)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrProductNotFound
	}
	return r.GetByID(ctx, id)
}

// Delete soft-deletes a product (status='deleted'), ONLY if owned by the seller
func (r *PostgresProductRepository) Delete(ctx context.Context, id, sellerID string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE products SET status = 'deleted' WHERE id = $1 AND seller_id = $2 AND status != 'deleted'`,
		id, sellerID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrProductNotFound
	}
	return nil
}

// UpdateStatus changes a product's status (active/inactive), ONLY if owned by the seller
func (r *PostgresProductRepository) UpdateStatus(ctx context.Context, id, sellerID, status string) (*domain.Product, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE products SET status = $1 WHERE id = $2 AND seller_id = $3 AND status != 'deleted'`,
		status, id, sellerID,
	)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrProductNotFound
	}
	return r.GetByID(ctx, id)
}

// ListBySeller returns a seller's own products (active + inactive, excludes deleted)
func (r *PostgresProductRepository) ListBySeller(ctx context.Context, sellerID string) ([]domain.Product, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+productColumns+`
		 FROM products
		 WHERE seller_id = $1 AND status != 'deleted'
		 ORDER BY created_at DESC`,
		sellerID,
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

// CountProducts returns product counts by status (for admin dashboard)
func (r *PostgresProductRepository) CountProducts(ctx context.Context) (map[string]int, error) {
	stats := map[string]int{"total": 0, "active": 0, "inactive": 0, "deleted": 0}

	rows, err := r.pool.Query(ctx, `SELECT status, COUNT(*) FROM products GROUP BY status`)
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
		stats[status] = count
	}
	return stats, rows.Err()
}

// CountSellerProducts returns a seller's listing counts by status (excludes deleted)
func (r *PostgresProductRepository) CountSellerProducts(ctx context.Context, sellerID string) (map[string]int, error) {
	stats := map[string]int{"total": 0, "active": 0, "inactive": 0}

	rows, err := r.pool.Query(ctx,
		`SELECT status, COUNT(*) FROM products
		 WHERE seller_id = $1 AND status != 'deleted'
		 GROUP BY status`,
		sellerID,
	)
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
		stats[status] = count
	}
	return stats, rows.Err()
}

// CountFavoritesReceived returns how many times a seller's products have been favorited
func (r *PostgresProductRepository) CountFavoritesReceived(ctx context.Context, sellerID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*)
		 FROM favorites f
		 JOIN products p ON p.id = f.product_id
		 WHERE p.seller_id = $1`,
		sellerID,
	).Scan(&count)
	return count, err
}
