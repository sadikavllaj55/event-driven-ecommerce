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
	Amount    int    `json:"amount,omitempty"`
	Reason    string `json:"reason,omitempty"`
}

func main() {
	// Load configuration
	cfg := LoadConfig()

	// Connect to RabbitMQ
	publisher, err := NewPublisher(cfg.RabbitURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer publisher.Close()

	// Connect to PostgreSQL
	db, err := NewDB(cfg.DBURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Start listening for stock results from the Inventory Service
	err = publisher.ConsumeResults(func(routingKey string, body []byte) {
		var result StockResult
		if err := json.Unmarshal(body, &result); err != nil {
			log.Printf("Failed to parse stock result: %v", err)
			return
		}

		switch routingKey {
		case routingKeyReserved:
			log.Printf("Order %s - stock reserved (product %s, qty %d)",
				result.OrderID, result.ProductID, result.Quantity)
			if err := db.UpdateOrderStatus(result.OrderID, "stock_reserved"); err != nil {
				log.Printf("Failed to update order status: %v", err)
			}
		case routingKeyFailed:
			log.Printf("Order %s FAILED - %s (product %s, qty %d)",
				result.OrderID, result.Reason, result.ProductID, result.Quantity)
			if err := db.UpdateOrderStatus(result.OrderID, "failed"); err != nil {
				log.Printf("Failed to update order status: %v", err)
			}
		case routingKeyPaymentSucceeded:
			log.Printf("Order %s PAID (amount %d)", result.OrderID, result.Amount)
			if err := db.UpdateOrderStatus(result.OrderID, "paid"); err != nil {
				log.Printf("Failed to update order status: %v", err)
			}
		case routingKeyPaymentFailed:
			log.Printf("Order %s PAYMENT FAILED - %s", result.OrderID, result.Reason)
			if err := db.UpdateOrderStatus(result.OrderID, "payment_failed"); err != nil {
				log.Printf("Failed to update order status: %v", err)
			}
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

		// Save the order to the database
		if err := db.SaveOrder(order); err != nil {
			log.Printf("Failed to save order: %v", err)
			http.Error(w, "failed to save order", http.StatusInternalServerError)
			return
		}

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

	port := ":" + cfg.Port
	log.Printf("Order Service running on %s", port)

	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal(err)
	}

}
