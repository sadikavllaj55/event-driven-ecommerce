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

	// --- Infrastructure: RabbitMQ ---
	publisher, err := NewPublisher(cfg.RabbitURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer publisher.Close()

	// --- Infrastructure: MinIO object storage ---
	storage, err := NewStorage(
		cfg.MinioEndpoint,
		cfg.MinioAccessKey,
		cfg.MinioSecretKey,
		cfg.MinioPublicHost,
	)
	if err != nil {
		log.Fatalf("Failed to connect to MinIO: %v", err)
	}

	// --- Wire the layers (dependency injection) ---
	repo := repository.NewPostgresProductRepository(pool)
	search, err := NewSearch([]string{cfg.ElasticURL})
	if err != nil {
		log.Fatalf("Failed to connect to Elasticsearch: %v", err)
	}

	userClient := NewUserClient(cfg.UserServiceURL)

	productSvc := service.NewProductService(repo, publisher, storage, search, userClient)

	productHandler := handler.NewProductHandler(productSvc)
	// Category tree (admin-managed)
	categorySvc := service.NewCategoryService(repo)
	categoryHandler := handler.NewCategoryHandler(categorySvc)
	settingsSvc := service.NewSettingsService(repo)
	settingsHandler := handler.NewSettingsHandler(settingsSvc)

	// --- HTTP server ---
	mux := http.NewServeMux()
	productHandler.RegisterRoutes(mux)
	productHandler.RegisterFavoriteRoutes(mux)
	categoryHandler.RegisterRoutes(mux)
	settingsHandler.RegisterRoutes(mux)

	port := ":" + cfg.Port
	log.Printf("Product Service running on %s", port)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal(err)
	}
}
