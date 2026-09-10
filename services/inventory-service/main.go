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

func main() {
	rabbitURL := "amqp://guest:guest@localhost:5672/"

	consumer, err := NewConsumer(rabbitURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer consumer.Close()

	// Start consuming order.created events
	err = consumer.Consume(func(body []byte) {
		var order Order
		if err := json.Unmarshal(body, &order); err != nil {
			log.Printf("Failed to parse message: %v", err)
			return
		}

		log.Printf("Received order.created event: order %s (product %s, qty %d)",
			order.ID, order.ProductID, order.Quantity)

		// Simulate stock reservation
		log.Printf("Reserving %d units of product %s...", order.Quantity, order.ProductID)
		log.Printf("Stock reserved for order %s", order.ID)
	})

	if err != nil {
		log.Fatalf("Consumer error: %v", err)
	}
}
