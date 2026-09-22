package domain

import (
	"errors"
	"time"
)

// OrderItem represents a single product line in an order
type OrderItem struct {
	ProductID  string `json:"product_id"`
	Quantity   int    `json:"quantity"`
	PriceCents int    `json:"price_cents"`
	Status     string `json:"status,omitempty"`
}

// Order represents a customer order with one or more items
type Order struct {
	ID         string      `json:"id"`
	BuyerID    string      `json:"buyer_id"`
	Status     string      `json:"status"`
	TotalCents int         `json:"total_cents"`
	Items      []OrderItem `json:"items"`
	CreatedAt  time.Time   `json:"created_at"`
}

// SagaResult mirrors results published by Inventory/Payment services
type SagaResult struct {
	OrderID string `json:"order_id"`
	Success bool   `json:"success"`
	Amount  int    `json:"amount,omitempty"`
	Reason  string `json:"reason,omitempty"`
}

// Domain errors
var (
	ErrNoItems       = errors.New("order must contain at least one item")
	ErrInvalidItem   = errors.New("each item needs product_id and quantity (>0)")
	ErrOrderNotFound = errors.New("order not found")
	ErrForbidden     = errors.New("not allowed to access this order")
)

// Order status values
const (
	StatusPending       = "pending"
	StatusStockReserved = "stock_reserved"
	StatusFailed        = "failed"
	StatusPaid          = "paid"
	StatusPaymentFailed = "payment_failed"
)
