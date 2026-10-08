package service

import (
	"context"
	"errors"
	"testing"

	"product-service/internal/domain"
	"product-service/internal/repository"
)

type categorySearchRepository struct {
	repository.CategoryRepository
	children  int
	updateErr error
}

func (repo *categorySearchRepository) UpdateCategory(ctx context.Context, id, name, slug string, parentID *string) (*domain.Category, error) {
	return &domain.Category{ID: id, Name: name, ParentID: parentID}, repo.updateErr
}

func (repo *categorySearchRepository) GetCategory(ctx context.Context, id string) (*domain.Category, error) {
	return &domain.Category{ID: id, Name: "Parent"}, nil
}

func (repo *categorySearchRepository) CountChildren(ctx context.Context, id string) (int, error) {
	return repo.children, nil
}

func (repo *categorySearchRepository) DeleteCategory(ctx context.Context, id string) error {
	return nil
}

func TestCategoryChangesRefreshSearch(t *testing.T) {
	repo := &categorySearchRepository{}
	refreshes := 0
	refreshErr := error(nil)
	svc := NewCategoryService(repo, func(ctx context.Context) (int, error) {
		refreshes++
		return 1, refreshErr
	})
	ctx := context.Background()
	if _, err := svc.Update(ctx, "shoes", "Footwear", nil); err != nil || refreshes != 1 {
		t.Fatalf("rename should refresh search: refreshes=%d error=%v", refreshes, err)
	}
	parentID := "clothing"
	if _, err := svc.Update(ctx, "shoes", "Footwear", &parentID); err != nil || refreshes != 2 {
		t.Fatalf("moving a category should refresh ancestor names: refreshes=%d error=%v", refreshes, err)
	}
	if err := svc.Delete(ctx, "shoes"); err != nil || refreshes != 3 {
		t.Fatalf("deletion should refresh search: refreshes=%d error=%v", refreshes, err)
	}
	repo.children = 1
	if err := svc.Delete(ctx, "clothing"); !errors.Is(err, domain.ErrCategoryHasChildren) || refreshes != 3 {
		t.Fatalf("blocked deletion must not refresh search: refreshes=%d error=%v", refreshes, err)
	}
	repo.updateErr = domain.ErrCategoryNotFound
	if _, err := svc.Update(ctx, "missing", "Missing", nil); err == nil || refreshes != 3 {
		t.Fatalf("failed update must not refresh search: refreshes=%d error=%v", refreshes, err)
	}
	repo.updateErr = nil
	refreshErr = errors.New("Elasticsearch unavailable")
	if _, err := svc.Update(ctx, "shoes", "Footwear", nil); err != nil || refreshes != 4 {
		t.Fatalf("saved category edit should survive index failure: refreshes=%d error=%v", refreshes, err)
	}
}
