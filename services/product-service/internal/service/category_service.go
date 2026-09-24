package service

import (
	"context"
	"regexp"
	"strings"

	"product-service/internal/domain"
	"product-service/internal/repository"
)

// CategoryService holds category business logic
type CategoryService struct {
	repo repository.CategoryRepository
}

func NewCategoryService(repo repository.CategoryRepository) *CategoryService {
	return &CategoryService{repo: repo}
}

// Create makes a new category (auto-generates a slug from the name)
func (s *CategoryService) Create(ctx context.Context, name string, parentID *string) (*domain.Category, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, domain.ErrInvalidInput
	}

	// If a parent is given, verify it exists
	if parentID != nil {
		if _, err := s.repo.GetCategory(ctx, *parentID); err != nil {
			return nil, err // ErrCategoryNotFound
		}
	}

	slug := slugify(name)
	return s.repo.CreateCategory(ctx, name, slug, parentID)
}

// List returns the full category tree (nested)
func (s *CategoryService) List(ctx context.Context) ([]domain.Category, error) {
	flat, err := s.repo.ListCategories(ctx)
	if err != nil {
		return nil, err
	}
	return buildTree(flat), nil
}

// Update renames/moves a category, preventing cycles
func (s *CategoryService) Update(ctx context.Context, id, name string, parentID *string) (*domain.Category, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, domain.ErrInvalidInput
	}

	// Prevent cycles: a category can't be its own parent or a descendant's child
	if parentID != nil {
		if *parentID == id {
			return nil, domain.ErrCategoryCycle
		}
		// Check the new parent isn't a descendant of this category
		isDesc, err := s.isDescendant(ctx, id, *parentID)
		if err != nil {
			return nil, err
		}
		if isDesc {
			return nil, domain.ErrCategoryCycle
		}
	}

	slug := slugify(name)
	return s.repo.UpdateCategory(ctx, id, name, slug, parentID)
}

// Delete removes a category (blocked if it has children)
func (s *CategoryService) Delete(ctx context.Context, id string) error {
	count, err := s.repo.CountChildren(ctx, id)
	if err != nil {
		return err
	}
	if count > 0 {
		return domain.ErrCategoryHasChildren
	}
	return s.repo.DeleteCategory(ctx, id)
}

// --- Helpers ---

// isDescendant checks if candidateID is a descendant of ancestorID (cycle check)
func (s *CategoryService) isDescendant(ctx context.Context, ancestorID, candidateID string) (bool, error) {
	current := candidateID
	for {
		cat, err := s.repo.GetCategory(ctx, current)
		if err != nil {
			return false, err
		}
		if cat.ParentID == nil {
			return false, nil // reached a root, not a descendant
		}
		if *cat.ParentID == ancestorID {
			return true, nil // found the ancestor -> it's a descendant
		}
		current = *cat.ParentID
	}
}

// buildTree converts a flat list into a nested tree
func buildTree(flat []domain.Category) []domain.Category {
	// Index by ID
	byID := make(map[string]*domain.Category, len(flat))
	for i := range flat {
		flat[i].Children = []domain.Category{}
		byID[flat[i].ID] = &flat[i]
	}

	roots := []domain.Category{}
	for i := range flat {
		c := &flat[i]
		if c.ParentID == nil {
			roots = append(roots, *c)
		}
	}

	// Attach children (one level of nesting via map, then recurse)
	// Simpler approach: rebuild recursively
	var attach func(parentID *string) []domain.Category
	attach = func(parentID *string) []domain.Category {
		children := []domain.Category{}
		for i := range flat {
			c := flat[i]
			match := (parentID == nil && c.ParentID == nil) ||
				(parentID != nil && c.ParentID != nil && *c.ParentID == *parentID)
			if match {
				c.Children = attach(&c.ID)
				children = append(children, c)
			}
		}
		return children
	}

	return attach(nil)
}

// slugify converts a name to a URL-friendly slug
func slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}
