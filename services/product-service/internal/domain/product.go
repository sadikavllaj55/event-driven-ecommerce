package domain

import (
	"errors"
	"fmt"
	"math"
	"time"
)

// Product represents a product in the catalog
type Product struct {
	ID          string    `json:"id"`
	SellerID    string    `json:"seller_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	PriceCents  int       `json:"price_cents"`
	Price       string    `json:"price"`
	Stock       int       `json:"stock"`
	ImageURL    string    `json:"image_url"`
	CreatedAt   time.Time `json:"created_at"`
}

// SetDisplayPrice populates the human-friendly Price field from PriceCents
func (p *Product) SetDisplayPrice() {
	p.Price = CentsToDisplay(p.PriceCents)
}

// Domain errors
var (
	ErrProductNotFound = errors.New("product not found")
	ErrInvalidInput    = errors.New("invalid product input")
)

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
