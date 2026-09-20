package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
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

// CreateOrderItemRequest is a single item in a create-order request
type CreateOrderItemRequest struct {
	ProductID  string `json:"product_id"`
	Quantity   int    `json:"quantity"`
	PriceCents int    `json:"price_cents"`
}

// CreateOrderRequest is the expected request body
type CreateOrderRequest struct {
	BuyerID string                   `json:"buyer_id"`
	Items   []CreateOrderItemRequest `json:"items"`
}

// SagaResult mirrors the result published by Inventory/Payment services
type SagaResult struct {
	OrderID string `json:"order_id"`
	Success bool   `json:"success"`
	Amount  int    `json:"amount,omitempty"`
	Reason  string `json:"reason,omitempty"`
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

	// Start listening for saga results from Inventory / Payment services
	err = publisher.ConsumeResults(func(routingKey string, body []byte) {
		var result SagaResult
		if err := json.Unmarshal(body, &result); err != nil {
			log.Printf("Failed to parse saga result: %v", err)
			return
		}

		switch routingKey {
		case routingKeyReserved:
			log.Printf("Order %s - all stock reserved", result.OrderID)
			if err := db.UpdateOrderStatus(result.OrderID, "stock_reserved"); err != nil {
				log.Printf("Failed to update order status: %v", err)
			}
		case routingKeyFailed:
			log.Printf("Order %s FAILED - %s", result.OrderID, result.Reason)
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

	// Health check (readiness) — verifies dependencies are reachable
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		checks := map[string]string{
			"database": "ok",
			"rabbitmq": "ok",
		}
		healthy := true

		// Check database
		if err := db.Ping(); err != nil {
			checks["database"] = "unavailable"
			healthy = false
		}

		// Check RabbitMQ
		if !publisher.IsReady() {
			checks["rabbitmq"] = "unavailable"
			healthy = false
		}

		w.Header().Set("Content-Type", "application/json")
		status := "ok"
		if !healthy {
			status = "degraded"
			w.WriteHeader(http.StatusServiceUnavailable) // 503
		}

		json.NewEncoder(w).Encode(map[string]any{
			"status":  status,
			"service": "order-service",
			"checks":  checks,
		})
	})

	// Create order
	mux.HandleFunc("POST /orders", func(w http.ResponseWriter, r *http.Request) {
		var req CreateOrderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		// Validation: must have at least one item
		if len(req.Items) == 0 {
			http.Error(w, "order must contain at least one item", http.StatusBadRequest)
			return
		}

		// Build the order items and compute the total
		items := make([]OrderItem, 0, len(req.Items))
		total := 0
		for _, it := range req.Items {
			if it.ProductID == "" || it.Quantity <= 0 {
				http.Error(w, "each item needs product_id and quantity (>0)", http.StatusBadRequest)
				return
			}
			items = append(items, OrderItem{
				ProductID:  it.ProductID,
				Quantity:   it.Quantity,
				PriceCents: it.PriceCents,
				Status:     "pending",
			})
			total += it.PriceCents * it.Quantity
		}

		order := Order{
			ID:         uuid.NewString(),
			BuyerID:    req.BuyerID,
			Status:     "pending",
			TotalCents: total,
			Items:      items,
			CreatedAt:  time.Now().UTC(),
		}

		log.Printf("Created order %s with %d item(s), total %d cents",
			order.ID, len(order.Items), order.TotalCents)

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
	server := &http.Server{
		Addr:    port,
		Handler: mux,
	}

	// Start the server in a goroutine so it doesn't block
	go func() {
		log.Printf("Order Service running on %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for a shutdown signal (Ctrl+C or container stop)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down gracefully...")

	// Give in-flight requests up to 10 seconds to finish
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped. Cleaning up...")
	// db.Close() and publisher.Close() run via their defers
}
