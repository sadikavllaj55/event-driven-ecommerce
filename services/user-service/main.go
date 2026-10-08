package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"user-service/internal/handler"
	"user-service/internal/repository"
	"user-service/internal/service"
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

	// --- Infrastructure: MinIO (avatars) ---
	storage, err := NewStorage(cfg.MinioEndpoint, cfg.MinioAccessKey, cfg.MinioSecretKey, cfg.MinioPublicHost)
	if err != nil {
		log.Fatalf("Failed to connect to MinIO: %v", err)
	}

	// --- Wire the layers (dependency injection) ---

	repo := repository.NewPostgresUserRepository(pool)
	search, err := NewMemberSearch(cfg.ElasticURL)
	if err != nil {
		log.Fatalf("Failed to initialize member search: %v", err)
	}
	totpManager := NewTOTPManager()
	userSvc := service.NewUserService(repo, BcryptHasher{}, publisher, totpManager, storage, search)
	reindex := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		if err := userSvc.ReindexProfiles(ctx); err != nil {
			log.Printf("Member index reconciliation failed; will retry: %v", err)
		}
	}
	reindex()
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			reindex()
		}
	}()
	userHandler := handler.NewUserHandler(userSvc)

	// --- HTTP server ---
	mux := http.NewServeMux()
	userHandler.RegisterRoutes(mux)
	userHandler.RegisterAdminRoutes(mux)

	port := ":" + cfg.Port
	log.Printf("User Service running on %s", port)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal(err)
	}
}
