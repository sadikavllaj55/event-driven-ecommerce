package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"order-service/internal/domain"
	"order-service/internal/repository"
)

// EventPublisher defines what the service needs to publish events.
// The service depends on this abstraction, not on RabbitMQ directly.
type EventPublisher interface {
	PublishOrderCreated(order domain.Order) error
}

// OrderService holds the business logic for orders
type OrderService struct {
	repo      repository.OrderRepository
	publisher EventPublisher
}

// NewOrderService wires the service with its dependencies
func NewOrderService(repo repository.OrderRepository, publisher EventPublisher) *OrderService {
	return &OrderService{repo: repo, publisher: publisher}
}

// CreateOrder validates the items, builds the order, saves it, and publishes the event.
// This is pure business logic — no HTTP, no SQL.
func (s *OrderService) CreateOrder(ctx context.Context, buyerID string, items []domain.OrderItem) (*domain.Order, error) {
	// Validation
	if len(items) == 0 {
		return nil, domain.ErrNoItems
	}

	total := 0
	built := make([]domain.OrderItem, 0, len(items))
	for _, it := range items {
		if it.ProductID == "" || it.Quantity <= 0 {
			return nil, domain.ErrInvalidItem
		}
		built = append(built, domain.OrderItem{
			ProductID:  it.ProductID,
			Quantity:   it.Quantity,
			PriceCents: it.PriceCents,
			Status:     domain.StatusPending,
		})
		total += it.PriceCents * it.Quantity
	}

	order := domain.Order{
		ID:         uuid.NewString(),
		BuyerID:    buyerID,
		Status:     domain.StatusPending,
		TotalCents: total,
		Items:      built,
		CreatedAt:  time.Now().UTC(),
	}

	// Persist the order
	if err := s.repo.SaveOrder(ctx, order); err != nil {
		return nil, err
	}

	// Publish the event (fire the saga)
	if err := s.publisher.PublishOrderCreated(order); err != nil {
		return nil, err
	}

	return &order, nil
}

// UpdateStatus updates an order's status (called when saga results arrive)
func (s *OrderService) UpdateStatus(ctx context.Context, orderID, status string) error {
	return s.repo.UpdateOrderStatus(ctx, orderID, status)
}

// HandleSagaResult maps a saga event to an order status update
func (s *OrderService) HandleSagaResult(ctx context.Context, routingKey string, result domain.SagaResult) error {
	var status string
	switch routingKey {
	case "stock.reserved":
		status = domain.StatusStockReserved
	case "stock.failed":
		status = domain.StatusFailed
	case "payment.succeeded":
		status = domain.StatusPaid
	case "payment.failed":
		status = domain.StatusPaymentFailed
	default:
		return nil // ignore unknown
	}
	return s.repo.UpdateOrderStatus(ctx, result.OrderID, status)
}
