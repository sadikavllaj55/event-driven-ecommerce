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
	Name        string         `json:"name"`
	Description string         `json:"description"`
	PriceCents  int            `json:"price_cents"`
	Price       string         `json:"price"`
	Stock       int            `json:"stock"`
	ImageURL    string         `json:"image_url"` // primary thumbnail
	Images      []ProductImage `json:"images"`    // full gallery
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
)

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
