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

	err = consumer.Consume(func(body []byte) {
		var order Order
		if err := json.Unmarshal(body, &order); err != nil {
			log.Printf("Failed to parse message: %v", err)
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

		// Try to reserve stock in the database
		remaining, err := db.ReserveStock(order.ProductID, order.Quantity)
		if err != nil {
			if errors.Is(err, ErrInsufficientStock) {
				result.Reserved = false
				result.Reason = "insufficient stock"
				routingKey = routingKeyFailed
				log.Printf("Stock FAILED for order %s (product %s, wanted %d)",
					order.ID, order.ProductID, order.Quantity)
			} else {
				// Unexpected DB error - log and skip
				log.Printf("Database error reserving stock: %v", err)
				return
			}
		} else {
			result.Reserved = true
			log.Printf("Stock reserved for order %s. Remaining %s: %d",
				order.ID, order.ProductID, remaining)
		}

		// Publish the result back
		resultBody, err := json.Marshal(result)
		if err != nil {
			log.Printf("Failed to marshal result: %v", err)
			return
		}

		if err := consumer.PublishResult(routingKey, resultBody); err != nil {
			log.Printf("Failed to publish result: %v", err)
		}
	})

	if err != nil {
		log.Fatalf("Consumer error: %v", err)
	}
}
