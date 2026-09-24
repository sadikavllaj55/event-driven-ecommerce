package domain

import (
	"errors"
	"time"
)

// Category is a node in the category tree
type Category struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Slug      string     `json:"slug"`
	ParentID  *string    `json:"parent_id"` // nil = root category
	Position  int        `json:"position"`
	CreatedAt time.Time  `json:"created_at"`
	Children  []Category `json:"children,omitempty"` // populated when building the tree
}

// Category errors
var (
	ErrCategoryNotFound    = errors.New("category not found")
	ErrCategoryHasChildren = errors.New("category has children and cannot be deleted")
	ErrCategoryCycle       = errors.New("cannot set a category as its own descendant")
	ErrSlugExists          = errors.New("a category with this slug already exists")
)
