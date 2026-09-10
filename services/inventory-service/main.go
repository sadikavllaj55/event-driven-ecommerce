package main

import (
	"encoding/json"
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

// availableStock simulates our inventory (product -> units available)
var availableStock = map[string]int{
	"prod-123": 10,
	"prod-456": 3,
}

func main() {
	rabbitURL := "amqp://guest:guest@localhost:5672/"

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

		// Decide whether we can reserve stock
		available := availableStock[order.ProductID]

		result := StockResult{
			OrderID:   order.ID,
			ProductID: order.ProductID,
			Quantity:  order.Quantity,
		}

		routingKey := routingKeyReserved

		if available >= order.Quantity {
			availableStock[order.ProductID] -= order.Quantity
			result.Reserved = true
			log.Printf("Stock reserved for order %s. Remaining %s: %d",
				order.ID, order.ProductID, availableStock[order.ProductID])
		} else {
			result.Reserved = false
			result.Reason = "insufficient stock"
			routingKey = routingKeyFailed
			log.Printf("Stock FAILED for order %s (wanted %d, have %d)",
				order.ID, order.Quantity, available)
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
