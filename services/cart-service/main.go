package main

import (
	"log"
	"net/http"

	"cart-service/internal/client"
	"cart-service/internal/handler"
	"cart-service/internal/repository"
	"cart-service/internal/service"
)

func main() {
	cfg := LoadConfig()

	// --- Infrastructure: Redis ---
	repo, err := repository.NewRedisCartRepository(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer repo.Close()
	log.Println("Connected to Redis")

	// --- Clients (other services) ---
	productClient := client.NewProductClient(cfg.ProductServiceURL)
	orderClient := client.NewOrderClient(cfg.OrderServiceURL)

	// --- Wire the layers (dependency injection) ---
	cartSvc := service.NewCartService(repo, productClient, orderClient)
	cartHandler := handler.NewCartHandler(cartSvc)

	// --- HTTP server ---
	mux := http.NewServeMux()
	cartHandler.RegisterRoutes(mux)

	port := ":" + cfg.Port
	log.Printf("Cart Service running on %s", port)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal(err)
	}
}
