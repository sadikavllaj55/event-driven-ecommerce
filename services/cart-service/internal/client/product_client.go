package client

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"cart-service/internal/domain"
)

// ProductClient fetches product details from the Product Service
type ProductClient struct {
	baseURL string
	http    *http.Client
}

func NewProductClient(baseURL string) *ProductClient {
	return &ProductClient{
		baseURL: baseURL,
		http:    &http.Client{Timeout: 5 * time.Second},
	}
}

// FetchProduct gets a product's real price from the Product Service.
// Returns a domain.CartItem carrying the product ID + real price.
func (c *ProductClient) FetchProduct(productID string) (*domain.CartItem, error) {
	resp, err := c.http.Get(fmt.Sprintf("%s/products/%s", c.baseURL, productID))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, domain.ErrProductNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("product service returned status %d", resp.StatusCode)
	}

	var product struct {
		ID         string `json:"id"`
		PriceCents int    `json:"price_cents"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&product); err != nil {
		return nil, err
	}

	return &domain.CartItem{
		ProductID:  product.ID,
		PriceCents: product.PriceCents,
	}, nil
}
