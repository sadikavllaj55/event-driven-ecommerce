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

	"github.com/jackc/pgx/v5/pgxpool"

	"order-service/internal/domain"
	"order-service/internal/handler"
	"order-service/internal/repository"
	"order-service/internal/service"
)

func main() {
	cfg := LoadConfig()

	// --- Infrastructure: Database ---
	pool, err := pgxpool.New(context.Background(), cfg.DBURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}
	log.Println("Connected to PostgreSQL")

	// --- Infrastructure: RabbitMQ ---
	publisher, err := NewPublisher(cfg.RabbitURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer publisher.Close()

	// --- Wire the layers (dependency injection) ---
	repo := repository.NewPostgresOrderRepository(pool)
	orderSvc := service.NewOrderService(repo, publisher)
	orderHandler := handler.NewOrderHandler(orderSvc)

	// --- Consume saga results and update order status ---
	// --- Consume saga results and delegate to the service ---
	err = publisher.ConsumeResults(func(routingKey string, body []byte) {
		var result domain.SagaResult
		if err := json.Unmarshal(body, &result); err != nil {
			log.Printf("Failed to parse saga result: %v", err)
			return
		}
		if err := orderSvc.HandleSagaResult(context.Background(), routingKey, result); err != nil {
			log.Printf("Failed to handle saga result for order %s: %v", result.OrderID, err)
		}
	})
	if err != nil {
		log.Fatalf("Failed to start result consumer: %v", err)
	}

	// --- HTTP server ---
	mux := http.NewServeMux()
	orderHandler.RegisterRoutes(mux)

	server := &http.Server{Addr: ":" + cfg.Port, Handler: mux}

	go func() {
		log.Printf("Order Service running on :%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// --- Graceful shutdown ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}
	log.Println("Server stopped. Cleaning up...")
}
