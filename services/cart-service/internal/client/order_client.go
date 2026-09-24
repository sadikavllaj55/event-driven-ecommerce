package client

import (
	"bytes"
	"encoding/json"
	"net/http"

	"cart-service/internal/domain"
)

// OrderClient creates orders via the Order Service
type OrderClient struct {
	baseURL string
}

func NewOrderClient(baseURL string) *OrderClient {
	return &OrderClient{baseURL: baseURL}
}

type orderItem struct {
	ProductID  string `json:"product_id"`
	Quantity   int    `json:"quantity"`
	PriceCents int    `json:"price_cents"`
}

type createOrderRequest struct {
	BuyerID string      `json:"buyer_id"`
	Items   []orderItem `json:"items"`
}

// CreateOrder posts an order to the Order Service, returning its raw response + status
func (c *OrderClient) CreateOrder(buyerID string, items []domain.CartItem) ([]byte, int, error) {
	orderItems := make([]orderItem, 0, len(items))
	for _, it := range items {
		orderItems = append(orderItems, orderItem{
			ProductID:  it.ProductID,
			Quantity:   it.Quantity,
			PriceCents: it.PriceCents,
		})
	}

	body, err := json.Marshal(createOrderRequest{BuyerID: buyerID, Items: orderItems})
	if err != nil {
		return nil, 0, err
	}

	resp, err := http.Post(c.baseURL+"/orders", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	buf := new(bytes.Buffer)
	buf.ReadFrom(resp.Body)
	return buf.Bytes(), resp.StatusCode, nil
}
