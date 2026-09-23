package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

// Product is the shape we need from the Product Service
type Product struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	PriceCents int    `json:"price_cents"`
	Stock      int    `json:"stock"`
}

// ErrProductNotFound is returned when a product doesn't exist
var ErrProductNotFound = errors.New("product not found")

// httpClient with a sensible timeout (don't hang forever on a slow service)
var productHTTPClient = &http.Client{Timeout: 5 * time.Second}

// FetchProduct gets a product from the Product Service by ID.
// This is how the Cart Service gets the REAL price — never trusting the client.
func FetchProduct(productServiceURL, productID string) (*Product, error) {
	url := fmt.Sprintf("%s/products/%s", productServiceURL, productID)

	resp, err := productHTTPClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrProductNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("product service returned status %d", resp.StatusCode)
	}

	var product Product
	if err := json.NewDecoder(resp.Body).Decode(&product); err != nil {
		return nil, err
	}

	return &product, nil
}
