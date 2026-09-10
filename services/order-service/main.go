package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// Order represents a customer order
type Order struct {
	ID        string    `json:"id"`
	ProductID string    `json:"product_id"`
	Quantity  int       `json:"quantity"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// CreateOrderRequest is the expected request body
type CreateOrderRequest struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

// StockResult mirrors the result published by the Inventory Service
type StockResult struct {
	OrderID   string `json:"order_id"`
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
	Reserved  bool   `json:"reserved"`
	Reason    string `json:"reason,omitempty"`
}

func main() {
	// Connect to RabbitMQ
	rabbitURL := "amqp://guest:guest@localhost:5672/"
	publisher, err := NewPublisher(rabbitURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer publisher.Close()

	// Start listening for stock results from the Inventory Service
	err = publisher.ConsumeResults(func(routingKey string, body []byte) {
		var result StockResult
		if err := json.Unmarshal(body, &result); err != nil {
			log.Printf("Failed to parse stock result: %v", err)
			return
		}

		switch routingKey {
		case routingKeyReserved:
			log.Printf("Order %s CONFIRMED - stock reserved (product %s, qty %d)",
				result.OrderID, result.ProductID, result.Quantity)
		case routingKeyFailed:
			log.Printf("Order %s FAILED - %s (product %s, qty %d)",
				result.OrderID, result.Reason, result.ProductID, result.Quantity)
		}
	})
	if err != nil {
		log.Fatalf("Failed to start result consumer: %v", err)
	}

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "ok",
			"service": "order-service",
		})
	})

	// Create order
	mux.HandleFunc("POST /orders", func(w http.ResponseWriter, r *http.Request) {
		var req CreateOrderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		// Basic validation
		if req.ProductID == "" || req.Quantity <= 0 {
			http.Error(w, "product_id and quantity (>0) are required", http.StatusBadRequest)
			return
		}

		order := Order{
			ID:        uuid.NewString(),
			ProductID: req.ProductID,
			Quantity:  req.Quantity,
			Status:    "pending",
			CreatedAt: time.Now().UTC(),
		}

		log.Printf("Created order: %+v", order)

		// Publish order.created event to RabbitMQ
		if err := publisher.PublishOrderCreated(order); err != nil {
			log.Printf("Failed to publish event: %v", err)
			http.Error(w, "failed to publish event", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(order)
	})

	port := ":8081"
	log.Printf("Order Service running on %s", port)

	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal(err)
	}
}
