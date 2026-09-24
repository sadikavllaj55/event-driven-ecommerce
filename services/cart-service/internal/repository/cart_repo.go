package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"

	"cart-service/internal/domain"
)

// CartRepository defines cart data-access
type CartRepository interface {
	GetCart(buyerID string) (*domain.Cart, error)
	AddItem(buyerID string, item domain.CartItem) (*domain.Cart, error)
	RemoveItem(buyerID, productID string) (*domain.Cart, error)
	ClearCart(buyerID string) error
}

// cartTTL: abandoned carts auto-expire after 7 days
const cartTTL = 7 * 24 * time.Hour

// RedisCartRepository is the Redis-backed implementation
type RedisCartRepository struct {
	client *redis.Client
}

// NewRedisCartRepository connects to Redis
func NewRedisCartRepository(addr string) (*RedisCartRepository, error) {
	client := redis.NewClient(&redis.Options{Addr: addr})
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}
	return &RedisCartRepository{client: client}, nil
}

func (r *RedisCartRepository) key(buyerID string) string {
	return "cart:" + buyerID
}

// GetCart returns a buyer's cart (empty if none exists)
func (r *RedisCartRepository) GetCart(buyerID string) (*domain.Cart, error) {
	ctx := context.Background()
	data, err := r.client.Get(ctx, r.key(buyerID)).Bytes()
	if err == redis.Nil {
		return &domain.Cart{BuyerID: buyerID, Items: []domain.CartItem{}}, nil
	}
	if err != nil {
		return nil, err
	}

	var cart domain.Cart
	if err := json.Unmarshal(data, &cart); err != nil {
		return nil, err
	}
	return &cart, nil
}

func (r *RedisCartRepository) save(cart *domain.Cart) error {
	ctx := context.Background()
	data, err := json.Marshal(cart)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, r.key(cart.BuyerID), data, cartTTL).Err()
}

// AddItem adds an item (or increases quantity if it already exists)
func (r *RedisCartRepository) AddItem(buyerID string, item domain.CartItem) (*domain.Cart, error) {
	cart, err := r.GetCart(buyerID)
	if err != nil {
		return nil, err
	}

	found := false
	for i := range cart.Items {
		if cart.Items[i].ProductID == item.ProductID {
			cart.Items[i].Quantity += item.Quantity
			cart.Items[i].PriceCents = item.PriceCents
			found = true
			break
		}
	}
	if !found {
		cart.Items = append(cart.Items, item)
	}

	if err := r.save(cart); err != nil {
		return nil, err
	}
	return cart, nil
}

// RemoveItem removes a product from the cart
func (r *RedisCartRepository) RemoveItem(buyerID, productID string) (*domain.Cart, error) {
	cart, err := r.GetCart(buyerID)
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

	if err := r.save(cart); err != nil {
		return nil, err
	}
	return cart, nil
}

// ClearCart deletes a buyer's cart (after checkout)
func (r *RedisCartRepository) ClearCart(buyerID string) error {
	return r.client.Del(context.Background(), r.key(buyerID)).Err()
}

// Close shuts down the Redis client
func (r *RedisCartRepository) Close() error {
	return r.client.Close()
}
