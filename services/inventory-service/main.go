package main

import (
	"encoding/json"
	"errors"
	"log"
	"time"
)

// Order mirrors the structure published by the Order Service
type Order struct {
	ID        string    `json:"id"`
	ProductID string    `json:"product_id"`
	Quantity  int       `json:"quantity"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// StockResult is what we publish back after processing an order
type StockResult struct {
	OrderID   string `json:"order_id"`
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
	Reserved  bool   `json:"reserved"`
	Reason    string `json:"reason,omitempty"`
}

// PaymentResult mirrors what the Payment Service publishes
type PaymentResult struct {
	OrderID   string `json:"order_id"`
	Amount    int    `json:"amount"`
	Success   bool   `json:"success"`
	Reason    string `json:"reason,omitempty"`
	ProductID string `json:"product_id,omitempty"`
	Quantity  int    `json:"quantity,omitempty"`
}

func main() {
	rabbitURL := "amqp://guest:guest@localhost:5672/"
	dbURL := "postgres://postgres:postgres@localhost:5433/ecommerce"

	// Connect to PostgreSQL
	db, err := NewDB(dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Connect to RabbitMQ
	consumer, err := NewConsumer(rabbitURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer consumer.Close()

	err = consumer.Consume(func(routingKey string, body []byte) {
		switch routingKey {
		case routingKeyOrderCreated:
			handleOrderCreated(db, consumer, body)
		case routingKeyPaymentFailed:
			handlePaymentFailed(db, body)
		default:
			log.Printf("Ignoring unknown routing key: %s", routingKey)
		}
	})

	if err != nil {
		log.Fatalf("Consumer error: %v", err)
	}
}

// handleOrderCreated reserves stock for a new order
func handleOrderCreated(db *DB, consumer *Consumer, body []byte) {
	var order Order
	if err := json.Unmarshal(body, &order); err != nil {
		log.Printf("Failed to parse order.created: %v", err)
		return
	}

	log.Printf("Received order.created event: order %s (product %s, qty %d)",
		order.ID, order.ProductID, order.Quantity)

	result := StockResult{
		OrderID:   order.ID,
		ProductID: order.ProductID,
		Quantity:  order.Quantity,
	}

	routingKey := routingKeyReserved

	remaining, err := db.ReserveStock(order.ProductID, order.Quantity)
	if err != nil {
		if errors.Is(err, ErrInsufficientStock) {
			result.Reserved = false
			result.Reason = "insufficient stock"
			routingKey = routingKeyFailed
			log.Printf("Stock FAILED for order %s (product %s, wanted %d)",
				order.ID, order.ProductID, order.Quantity)
		} else {
			log.Printf("Database error reserving stock: %v", err)
			return
		}
	} else {
		result.Reserved = true
		log.Printf("Stock reserved for order %s. Remaining %s: %d",
			order.ID, order.ProductID, remaining)
	}

	resultBody, err := json.Marshal(result)
	if err != nil {
		log.Printf("Failed to marshal result: %v", err)
		return
	}

	if err := consumer.PublishResult(routingKey, resultBody); err != nil {
		log.Printf("Failed to publish result: %v", err)
	}
}

// handlePaymentFailed restores stock (compensating action)
func handlePaymentFailed(db *DB, body []byte) {
	var payment PaymentResult
	if err := json.Unmarshal(body, &payment); err != nil {
		log.Printf("Failed to parse payment.failed: %v", err)
		return
	}

	log.Printf("Received payment.failed for order %s - restoring stock", payment.OrderID)

	if payment.ProductID == "" || payment.Quantity == 0 {
		log.Printf("Cannot restore stock: missing product/quantity in payment.failed for order %s",
			payment.OrderID)
		return
	}

	if err := db.RestoreStock(payment.ProductID, payment.Quantity); err != nil {
		log.Printf("Failed to restore stock: %v", err)
		return
	}

	log.Printf("Stock restored for order %s (product %s, qty %d)",
		payment.OrderID, payment.ProductID, payment.Quantity)
}
