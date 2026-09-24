package service

import (
	"net/http"

	"cart-service/internal/domain"
	"cart-service/internal/repository"
)

// ProductFetcher fetches product details (for real prices) — implemented by the product client
type ProductFetcher interface {
	FetchProduct(productID string) (*domain.CartItem, error)
}

// OrderCreator creates an order from cart items — implemented by the order client
type OrderCreator interface {
	CreateOrder(buyerID string, items []domain.CartItem) (body []byte, status int, err error)
}

// CartService holds cart business logic
type CartService struct {
	repo     repository.CartRepository
	products ProductFetcher
	orders   OrderCreator
}

func NewCartService(repo repository.CartRepository, products ProductFetcher, orders OrderCreator) *CartService {
	return &CartService{repo: repo, products: products, orders: orders}
}

// GetCart returns a buyer's cart
func (s *CartService) GetCart(buyerID string) (*domain.Cart, error) {
	return s.repo.GetCart(buyerID)
}

// AddItem fetches the REAL price from the Product Service, then adds the item.
// SECURITY: never trusts a client-supplied price.
func (s *CartService) AddItem(buyerID, productID string, quantity int) (*domain.Cart, error) {
	if productID == "" || quantity <= 0 {
		return nil, domain.ErrInvalidItem
	}

	product, err := s.products.FetchProduct(productID)
	if err != nil {
		return nil, err // ErrProductNotFound or a fetch error
	}

	return s.repo.AddItem(buyerID, domain.CartItem{
		ProductID:  product.ProductID,
		Quantity:   quantity,
		PriceCents: product.PriceCents, // the REAL price, from the server
	})
}

// RemoveItem removes an item from the cart
func (s *CartService) RemoveItem(buyerID, productID string) (*domain.Cart, error) {
	return s.repo.RemoveItem(buyerID, productID)
}

// Checkout turns the cart into an order, clearing the cart on success.
// Returns the Order Service's raw response body + status.
func (s *CartService) Checkout(buyerID string) ([]byte, int, error) {
	cart, err := s.repo.GetCart(buyerID)
	if err != nil {
		return nil, 0, err
	}
	if len(cart.Items) == 0 {
		return nil, 0, domain.ErrCartEmpty
	}

	body, status, err := s.orders.CreateOrder(buyerID, cart.Items)
	if err != nil {
		return nil, 0, err
	}

	// Clear the cart if the order was created (best-effort)
	if status == http.StatusCreated {
		_ = s.repo.ClearCart(buyerID)
	}
	return body, status, nil
}
