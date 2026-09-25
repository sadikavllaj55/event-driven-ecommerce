package domain

import (
	"errors"
	"fmt"
	"math"
	"time"
)

// ProductImage is a single image belonging to a product
type ProductImage struct {
	ID        string    `json:"id"`
	ProductID string    `json:"product_id"`
	ImageURL  string    `json:"image_url"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
}

type Product struct {
	ID          string         `json:"id"`
	SellerID    string         `json:"seller_id"`
	SellerName  string         `json:"seller_name,omitempty"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	PriceCents  int            `json:"price_cents"`
	Price       string         `json:"price"`
	Stock       int            `json:"stock"`
	Gender      string         `json:"gender"`
	Brand       string         `json:"brand"`
	ModelCode   string         `json:"model_code"`
	Condition   string         `json:"condition"`
	Material    string         `json:"material"`
	Color       string         `json:"color"`
	Size        string         `json:"size"`
	CategoryID  *string        `json:"category_id"`
	Status      string         `json:"status"`
	ImageURL    string         `json:"image_url"`
	Images      []ProductImage `json:"images"`
	CreatedAt   time.Time      `json:"created_at"`
}

// SetDisplayPrice populates the human-friendly Price field from PriceCents
func (p *Product) SetDisplayPrice() {
	p.Price = CentsToDisplay(p.PriceCents)
}

// Domain errors
var (
	ErrProductNotFound  = errors.New("product not found")
	ErrInvalidInput     = errors.New("invalid product input")
	ErrMaxImagesReached = errors.New("maximum images per product reached")
	ErrInvalidStatus    = errors.New("status must be 'active' or 'inactive'")
	ErrAlreadyFavorited = errors.New("product already in favorites")
	ErrNotFavorited     = errors.New("product not in favorites")
)

// Valid gender values
var validGenders = map[string]bool{
	"women": true, "men": true, "unisex": true, "kids": true,
}

// Valid condition values
var validConditions = map[string]bool{
	"new_with_tags": true, "new_without_tags": true,
	"very_good": true, "good": true, "satisfactory": true,
}

// IsValidGender checks if a gender value is allowed
func IsValidGender(g string) bool {
	return validGenders[g]
}

// IsValidCondition checks if a condition value is allowed
func IsValidCondition(c string) bool {
	return validConditions[c]
}

// Product status values
const (
	StatusActive   = "active"
	StatusInactive = "inactive"
	StatusDeleted  = "deleted"
)

var validStatuses = map[string]bool{
	StatusActive:   true,
	StatusInactive: true,
}

// IsValidStatusChange checks if a status is one a seller can set
// (sellers can set active/inactive, but NOT 'deleted' — that's via DELETE)
func IsValidStatusChange(s string) bool {
	return validStatuses[s]
}

// MaxImagesPerProduct is the limit (Phase 1: hardcoded; Phase 2: admin-configurable)
const MaxImagesPerProduct = 5

// --- Money helpers (store cents internally, display dollars) ---

// DollarsToCents converts a dollar amount (49.99) to integer cents (4999).
// math.Round avoids floating-point truncation (49.99*100 = 4998.9999...).
func DollarsToCents(dollars float64) int {
	return int(math.Round(dollars * 100))
}

// CentsToDisplay formats integer cents (4999) as a dollar string ("49.99").
func CentsToDisplay(cents int) string {
	return fmt.Sprintf("%.2f", float64(cents)/100)
}
