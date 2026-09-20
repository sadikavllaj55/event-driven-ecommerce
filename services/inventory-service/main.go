package main

import (
	"encoding/json"
	"errors"
	"log"
	"time"
)

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
	CreatedAt  time.Time   `json:"created_at"`
}

// SagaResult is what we publish back after processing
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

func main() {
	cfg := LoadConfig()

	db, err := NewDB(cfg.DBURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	consumer, err := NewConsumer(cfg.RabbitURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer consumer.Close()

	err = consumer.Consume(func(routingKey string, body []byte) error {
		switch routingKey {
		case routingKeyOrderCreated:
			return handleOrderCreated(db, consumer, body)
		case routingKeyPaymentFailed:
			return handlePaymentFailed(db, body)
		default:
			log.Printf("Ignoring unknown routing key: %s", routingKey)
			return nil
		}
	})

	if err != nil {
		log.Fatalf("Consumer error: %v", err)
	}
}

// handleOrderCreated reserves stock for ALL items in the order (all-or-nothing)
func handleOrderCreated(db *DB, consumer *Consumer, body []byte) error {
	var order Order
	if err := json.Unmarshal(body, &order); err != nil {
		log.Printf("Failed to parse order.created: %v", err)
		return err
	}

	log.Printf("Received order.created: order %s with %d item(s)",
		order.ID, len(order.Items))

	items := make([]Item, 0, len(order.Items))
	for _, it := range order.Items {
		items = append(items, Item{ProductID: it.ProductID, Quantity: it.Quantity})
	}

	result := SagaResult{
		OrderID:    order.ID,
		TotalCents: order.TotalCents,
		Items:      order.Items,
	}
	routingKey := routingKeyReserved

	err := db.ReserveItems(items)
	if err != nil {
		if errors.Is(err, ErrInsufficientStock) {
			result.Success = false
			result.Reason = "insufficient stock"
			routingKey = routingKeyFailed
			log.Printf("Stock FAILED for order %s (insufficient stock)", order.ID)
		} else {
			log.Printf("Database error reserving stock: %v", err)
			return err
		}
	} else {
		result.Success = true
		log.Printf("All stock reserved for order %s", order.ID)
	}

	resultBody, err := json.Marshal(result)
	if err != nil {
		log.Printf("Failed to marshal result: %v", err)
		return err
	}

	if err := consumer.PublishResult(routingKey, resultBody); err != nil {
		log.Printf("Failed to publish result: %v", err)
		return err
	}

	return nil
}

// handlePaymentFailed restores stock for all items (compensating action)
func handlePaymentFailed(db *DB, body []byte) error {
	var payment PaymentResult
	if err := json.Unmarshal(body, &payment); err != nil {
		log.Printf("Failed to parse payment.failed: %v", err)
		return err
	}

	log.Printf("Received payment.failed for order %s - restoring stock", payment.OrderID)

	if len(payment.Items) == 0 {
		log.Printf("No items to restore for order %s", payment.OrderID)
		return nil
	}

	items := make([]Item, 0, len(payment.Items))
	for _, it := range payment.Items {
		items = append(items, Item{ProductID: it.ProductID, Quantity: it.Quantity})
	}

	if err := db.RestoreItems(items); err != nil {
		log.Printf("Failed to restore stock: %v", err)
		return err
	}

	log.Printf("Stock restored for order %s (%d item(s))", payment.OrderID, len(items))
	return nil
}
