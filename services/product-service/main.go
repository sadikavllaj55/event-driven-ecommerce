package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
)

// --- Request types ---

type CreateProductRequest struct {
	SellerID    string `json:"seller_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	PriceCents  int    `json:"price_cents"`
	Stock       int    `json:"stock"`
	ImageURL    string `json:"image_url"`
}

type UpdateProductRequest struct {
	SellerID    string `json:"seller_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	PriceCents  int    `json:"price_cents"`
	Stock       int    `json:"stock"`
	ImageURL    string `json:"image_url"`
}

type DeleteProductRequest struct {
	SellerID string `json:"seller_id"`
}

func main() {
	cfg := LoadConfig()

	db, err := NewDB(cfg.DBURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "product-service",
		})
	})

	// List all products (public — anyone can browse)
	mux.HandleFunc("GET /products", func(w http.ResponseWriter, r *http.Request) {
		products, err := db.ListProducts()
		if err != nil {
			log.Printf("Failed to list products: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to list products")
			return
		}
		writeJSON(w, http.StatusOK, products)
	})

	// Get a single product (public)
	mux.HandleFunc("GET /products/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		product, err := db.GetProduct(id)
		if err != nil {
			if errors.Is(err, ErrProductNotFound) {
				writeError(w, http.StatusNotFound, "product not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to fetch product")
			return
		}
		writeJSON(w, http.StatusOK, product)
	})

	// Create a product (seller only)
	mux.HandleFunc("POST /products", func(w http.ResponseWriter, r *http.Request) {
		// Seller identity comes from the gateway-verified X-User-ID header
		sellerID := r.Header.Get("X-User-ID")
		if sellerID == "" {
			writeError(w, http.StatusBadRequest, "missing seller identity")
			return
		}

		var req CreateProductRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		req.SellerID = sellerID // override with the trusted identity

		// Validate
		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			writeError(w, http.StatusBadRequest, "name is required")
			return
		}

		if req.PriceCents < 0 || req.Stock < 0 {
			writeError(w, http.StatusBadRequest, "price and stock must be non-negative")
			return
		}

		product, err := db.CreateProduct(req.SellerID, req.Name, req.Description, req.PriceCents, req.Stock, req.ImageURL)
		if err != nil {
			log.Printf("Failed to create product: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to create product")
			return
		}

		log.Printf("Created product %s by seller %s", product.ID, product.SellerID)
		writeJSON(w, http.StatusCreated, product)
	})

	// Update a product (seller only, own products)
	mux.HandleFunc("PUT /products/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")

		var req UpdateProductRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.SellerID == "" {
			writeError(w, http.StatusBadRequest, "seller_id is required")
			return
		}

		product, err := db.UpdateProduct(id, req.SellerID, req.Name, req.Description, req.PriceCents, req.Stock, req.ImageURL)
		if err != nil {
			if errors.Is(err, ErrProductNotFound) {
				writeError(w, http.StatusNotFound, "product not found or not owned by you")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to update product")
			return
		}

		writeJSON(w, http.StatusOK, product)
	})

	// Delete a product (seller only, own products)
	mux.HandleFunc("DELETE /products/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")

		var req DeleteProductRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.SellerID == "" {
			writeError(w, http.StatusBadRequest, "seller_id is required")
			return
		}

		if err := db.DeleteProduct(id, req.SellerID); err != nil {
			if errors.Is(err, ErrProductNotFound) {
				writeError(w, http.StatusNotFound, "product not found or not owned by you")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to delete product")
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "product deleted"})
	})

	port := ":" + cfg.Port
	log.Printf("Product Service running on %s", port)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal(err)
	}
}

// --- Helpers ---

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
