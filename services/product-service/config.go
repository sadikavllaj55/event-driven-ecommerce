package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the service
type Config struct {
	DBURL           string
	RabbitURL       string
	Port            string
	MinioEndpoint   string
	MinioAccessKey  string
	MinioSecretKey  string
	MinioPublicHost string
	ElasticURL      string
}

// LoadConfig loads configuration from a .env file (if present) and environment variables
func LoadConfig() Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables / defaults")
	}

	return Config{
		ElasticURL:      getEnv("ELASTIC_URL", "http://localhost:9200"),
		DBURL:           getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5433/ecommerce"),
		RabbitURL:       getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		Port:            getEnv("PORT", "8083"),
		MinioEndpoint:   getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey:  getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey:  getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinioPublicHost: getEnv("MINIO_PUBLIC_HOST", "localhost:9000"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
