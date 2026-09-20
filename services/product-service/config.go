package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the service
type Config struct {
	DBURL string
	Port  string
}

// LoadConfig loads configuration from a .env file (if present) and environment variables
func LoadConfig() Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables / defaults")
	}

	return Config{
		DBURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5433/ecommerce"),
		Port:  getEnv("PORT", "8083"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
