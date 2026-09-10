package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the service
type Config struct {
	RabbitURL string
	DBURL     string
	Port      string
}

// LoadConfig loads configuration from a .env file (if present) and environment variables
func LoadConfig() Config {
	// Load .env file if it exists (ignore error if it doesn't)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables / defaults")
	}

	return Config{
		RabbitURL: getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		DBURL:     getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5433/ecommerce"),
		Port:      getEnv("PORT", "8081"),
	}
}

// getEnv returns the value of an environment variable, or a fallback if unset
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
