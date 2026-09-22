package domain

import "errors"

// OrderItem mirrors an item in the order
type OrderItem struct {
	ProductID  string `json:"product_id"`
	Quantity   int    `json:"quantity"`
	PriceCents int    `json:"price_cents"`
}

// Order mirrors the multi-item order published by the Order Service
type Order struct {
	ID         string      `json:"id"`
	BuyerID    string      `json:"buyer_id"`
	Status     string      `json:"status"`
	TotalCents int         `json:"total_cents"`
	Items      []OrderItem `json:"items"`
}

// SagaResult is what we publish back after reserving stock
type SagaResult struct {
	OrderID    string      `json:"order_id"`
	Success    bool        `json:"success"`
	Reason     string      `json:"reason,omitempty"`
	TotalCents int         `json:"total_cents,omitempty"`
	Items      []OrderItem `json:"items,omitempty"`
}

// PaymentResult mirrors what the Payment Service publishes
type PaymentResult struct {
	OrderID string      `json:"order_id"`
	Amount  int         `json:"amount"`
	Success bool        `json:"success"`
	Reason  string      `json:"reason,omitempty"`
	Items   []OrderItem `json:"items,omitempty"`
}

// Item is a product + quantity to reserve/restore
type Item struct {
	ProductID string
	Quantity  int
}

// Domain errors
var ErrInsufficientStock = errors.New("insufficient stock")
