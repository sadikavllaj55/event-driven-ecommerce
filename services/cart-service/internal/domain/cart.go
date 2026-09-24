package domain

import "errors"

// CartItem is a single product in the cart
type CartItem struct {
	ProductID  string `json:"product_id"`
	Quantity   int    `json:"quantity"`
	PriceCents int    `json:"price_cents"`
}

// Cart is a buyer's shopping cart
type Cart struct {
	BuyerID string     `json:"buyer_id"`
	Items   []CartItem `json:"items"`
}

// Domain errors
var (
	ErrInvalidItem     = errors.New("product_id and quantity (>0) are required")
	ErrCartEmpty       = errors.New("cart is empty")
	ErrProductNotFound = errors.New("product not found")
	ErrMissingBuyer    = errors.New("missing buyer identity")
)
