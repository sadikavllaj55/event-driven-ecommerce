package service

import (
	"context"
	"errors"
	"log"

	"inventory-service/internal/domain"
	"inventory-service/internal/repository"
)

// ResultPublisher defines what the service needs to publish results.
// The service depends on this abstraction, not on RabbitMQ directly.
type ResultPublisher interface {
	PublishResult(routingKey string, body []byte) error
}

// Routing keys the service publishes
const (
	RoutingKeyReserved = "stock.reserved"
	RoutingKeyFailed   = "stock.failed"
)

// InventoryService holds the business logic for stock management
type InventoryService struct {
	repo      repository.StockRepository
	publisher ResultPublisher
}

// NewInventoryService wires the service with its dependencies
func NewInventoryService(repo repository.StockRepository, publisher ResultPublisher) *InventoryService {
	return &InventoryService{repo: repo, publisher: publisher}
}

// ReserveOrder attempts to reserve stock for all items in an order (all-or-nothing),
// then publishes stock.reserved or stock.failed.
func (s *InventoryService) ReserveOrder(ctx context.Context, order domain.Order) error {
	items := make([]domain.Item, 0, len(order.Items))
	for _, it := range order.Items {
		items = append(items, domain.Item{ProductID: it.ProductID, Quantity: it.Quantity})
	}

	result := domain.SagaResult{
		OrderID:    order.ID,
		TotalCents: order.TotalCents,
		Items:      order.Items,
	}
	routingKey := RoutingKeyReserved

	err := s.repo.ReserveItems(ctx, items)
	if err != nil {
		if errors.Is(err, domain.ErrInsufficientStock) {
			result.Success = false
			result.Reason = "insufficient stock"
			routingKey = RoutingKeyFailed
			log.Printf("Stock FAILED for order %s (insufficient stock)", order.ID)
		} else {
			// Real DB error — return it so the message can be dead-lettered
			return err
		}
	} else {
		result.Success = true
		log.Printf("All stock reserved for order %s", order.ID)
	}

	return s.publishResult(routingKey, result)
}

// RestoreOrder restores stock for all items (compensating action after payment failure)
func (s *InventoryService) RestoreOrder(ctx context.Context, payment domain.PaymentResult) error {
	if len(payment.Items) == 0 {
		log.Printf("No items to restore for order %s", payment.OrderID)
		return nil
	}

	items := make([]domain.Item, 0, len(payment.Items))
	for _, it := range payment.Items {
		items = append(items, domain.Item{ProductID: it.ProductID, Quantity: it.Quantity})
	}

	if err := s.repo.RestoreItems(ctx, items); err != nil {
		return err
	}

	log.Printf("Stock restored for order %s (%d item(s))", payment.OrderID, len(items))
	return nil
}

// RegisterStock sets initial stock for a newly created product
func (s *InventoryService) RegisterStock(ctx context.Context, productID string, quantity int) error {
	if err := s.repo.UpsertStock(ctx, productID, quantity); err != nil {
		return err
	}
	log.Printf("Registered stock for product %s: %d units", productID, quantity)
	return nil
}

// publishResult marshals and publishes a saga result
func (s *InventoryService) publishResult(routingKey string, result domain.SagaResult) error {
	body, err := marshalResult(result)
	if err != nil {
		return err
	}
	return s.publisher.PublishResult(routingKey, body)
}
