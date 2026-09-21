package main

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

// CartItem is a single product in the cart
type CartItem struct {
	ProductID  string `json:"product_id"`
	Quantity   int    `json:"quantity"`
	PriceCents int    `json:"price_cents"`
}

// Cart is a buyer's shopping cart
type Cart struct {
	BuyerID string     `json:"buyer_id"`
	Items   []CartItem `json:"items"`
}

// CartStore wraps the Redis client
type CartStore struct {
	client *redis.Client
}

// cartTTL: abandoned carts auto-expire after 7 days
const cartTTL = 7 * 24 * time.Hour

// NewCartStore connects to Redis
func NewCartStore(addr string) (*CartStore, error) {
	client := redis.NewClient(&redis.Options{Addr: addr})

	// Verify the connection
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}

	return &CartStore{client: client}, nil
}

// key builds the Redis key for a buyer's cart
func (s *CartStore) key(buyerID string) string {
	return "cart:" + buyerID
}

// GetCart returns a buyer's cart (empty if none exists)
func (s *CartStore) GetCart(buyerID string) (*Cart, error) {
	ctx := context.Background()

	data, err := s.client.Get(ctx, s.key(buyerID)).Bytes()
	if err == redis.Nil {
		// No cart yet — return an empty one
		return &Cart{BuyerID: buyerID, Items: []CartItem{}}, nil
	}
	if err != nil {
		return nil, err
	}

	var cart Cart
	if err := json.Unmarshal(data, &cart); err != nil {
		return nil, err
	}
	return &cart, nil
}

// saveCart persists a cart to Redis with the TTL
func (s *CartStore) saveCart(cart *Cart) error {
	ctx := context.Background()
	data, err := json.Marshal(cart)
	if err != nil {
		return err
	}
	return s.client.Set(ctx, s.key(cart.BuyerID), data, cartTTL).Err()
}

// AddItem adds an item to the cart (or increases quantity if it already exists)
func (s *CartStore) AddItem(buyerID string, item CartItem) (*Cart, error) {
	cart, err := s.GetCart(buyerID)
	if err != nil {
		return nil, err
	}

	// If the product is already in the cart, increase its quantity
	found := false
	for i := range cart.Items {
		if cart.Items[i].ProductID == item.ProductID {
			cart.Items[i].Quantity += item.Quantity
			cart.Items[i].PriceCents = item.PriceCents // update price snapshot
			found = true
			break
		}
	}
	if !found {
		cart.Items = append(cart.Items, item)
	}

	if err := s.saveCart(cart); err != nil {
		return nil, err
	}
	return cart, nil
}

// RemoveItem removes a product from the cart
func (s *CartStore) RemoveItem(buyerID, productID string) (*Cart, error) {
	cart, err := s.GetCart(buyerID)
	if err != nil {
		return nil, err
	}

	filtered := cart.Items[:0]
	for _, it := range cart.Items {
		if it.ProductID != productID {
			filtered = append(filtered, it)
		}
	}
	cart.Items = filtered

	if err := s.saveCart(cart); err != nil {
		return nil, err
	}
	return cart, nil
}

// ClearCart deletes a buyer's cart (used after checkout)
func (s *CartStore) ClearCart(buyerID string) error {
	return s.client.Del(context.Background(), s.key(buyerID)).Err()
}

// Close shuts down the Redis client
func (s *CartStore) Close() error {
	return s.client.Close()
}
