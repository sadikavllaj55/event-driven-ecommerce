package main

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"

	"inventory-service/internal/consumer"
	"inventory-service/internal/repository"
	"inventory-service/internal/service"
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
	rabbit, err := NewConsumer(cfg.RabbitURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer rabbit.Close()

	// --- Wire the layers (dependency injection) ---
	repo := repository.NewPostgresStockRepository(pool)
	invSvc := service.NewInventoryService(repo, rabbit)
	handler := consumer.NewMessageHandler(invSvc)

	// --- Start consuming (blocks) ---
	if err := rabbit.Consume(handler.Handle); err != nil {
		log.Fatalf("Consumer error: %v", err)
	}
}
