package main

import (
	"context"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"product-service/internal/handler"
	"product-service/internal/repository"
	"product-service/internal/service"
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

	// --- Wire the layers (dependency injection) ---
	repo := repository.NewPostgresProductRepository(pool)
	productSvc := service.NewProductService(repo)
	productHandler := handler.NewProductHandler(productSvc)

	// --- HTTP server ---
	mux := http.NewServeMux()
	productHandler.RegisterRoutes(mux)

	port := ":" + cfg.Port
	log.Printf("Product Service running on %s", port)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal(err)
	}
}
