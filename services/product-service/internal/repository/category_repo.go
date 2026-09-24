package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"product-service/internal/domain"
)

// CategoryRepository defines category data-access
type CategoryRepository interface {
	CreateCategory(ctx context.Context, name, slug string, parentID *string) (*domain.Category, error)
	ListCategories(ctx context.Context) ([]domain.Category, error)
	GetCategory(ctx context.Context, id string) (*domain.Category, error)
	UpdateCategory(ctx context.Context, id, name, slug string, parentID *string) (*domain.Category, error)
	DeleteCategory(ctx context.Context, id string) error
	CountChildren(ctx context.Context, id string) (int, error)
}

// CreateCategory inserts a new category
func (r *PostgresProductRepository) CreateCategory(ctx context.Context, name, slug string, parentID *string) (*domain.Category, error) {
	c := &domain.Category{
		ID:       uuid.NewString(),
		Name:     name,
		Slug:     slug,
		ParentID: parentID,
	}

	err := r.pool.QueryRow(ctx,
		`INSERT INTO categories (id, name, slug, parent_id)
		 VALUES ($1, $2, $3, $4)
		 RETURNING created_at`,
		c.ID, c.Name, c.Slug, c.ParentID,
	).Scan(&c.CreatedAt)

	if err != nil {
		if isUniqueViolation(err) {
			return nil, domain.ErrSlugExists
		}
		return nil, err
	}
	return c, nil
}

// ListCategories returns all categories (flat — the service builds the tree)
func (r *PostgresProductRepository) ListCategories(ctx context.Context) ([]domain.Category, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, slug, parent_id, position, created_at
		 FROM categories ORDER BY position, name`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := []domain.Category{}
	for rows.Next() {
		var c domain.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.ParentID, &c.Position, &c.CreatedAt); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

// GetCategory returns a single category
func (r *PostgresProductRepository) GetCategory(ctx context.Context, id string) (*domain.Category, error) {
	var c domain.Category
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, slug, parent_id, position, created_at
		 FROM categories WHERE id = $1`,
		id,
	).Scan(&c.ID, &c.Name, &c.Slug, &c.ParentID, &c.Position, &c.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrCategoryNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// UpdateCategory updates a category's name, slug, and parent
func (r *PostgresProductRepository) UpdateCategory(ctx context.Context, id, name, slug string, parentID *string) (*domain.Category, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE categories SET name = $1, slug = $2, parent_id = $3 WHERE id = $4`,
		name, slug, parentID, id,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, domain.ErrSlugExists
		}
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrCategoryNotFound
	}
	return r.GetCategory(ctx, id)
}

// DeleteCategory removes a category (DB blocks it if it has children via ON DELETE RESTRICT)
func (r *PostgresProductRepository) DeleteCategory(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM categories WHERE id = $1`, id)
	if err != nil {
		// Foreign key violation = has children
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return domain.ErrCategoryHasChildren
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrCategoryNotFound
	}
	return nil
}

// CountChildren returns how many direct children a category has
func (r *PostgresProductRepository) CountChildren(ctx context.Context, id string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM categories WHERE parent_id = $1`,
		id,
	).Scan(&count)
	return count, err
}

// isUniqueViolation checks if an error is a Postgres unique constraint violation
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}
