package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the service
type Config struct {
	RedisURL          string
	OrderServiceURL   string
	ProductServiceURL string
	Port              string
}

// LoadConfig loads configuration from a .env file (if present) and environment variables
func LoadConfig() Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables / defaults")
	}

	return Config{
		RedisURL:          getEnv("REDIS_URL", "localhost:6379"),
		OrderServiceURL:   getEnv("ORDER_SERVICE_URL", "http://localhost:8081"),
		ProductServiceURL: getEnv("PRODUCT_SERVICE_URL", "http://localhost:8083"),
		Port:              getEnv("PORT", "8084"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
