package consumer

import (
	"context"
	"encoding/json"
	"log"

	"inventory-service/internal/domain"
	"inventory-service/internal/service"
)

// Routing keys this consumer handles
const (
	RoutingKeyOrderCreated  = "order.created"
	RoutingKeyPaymentFailed = "payment.failed"
)

// MessageHandler translates incoming messages into service calls.
// It's the event-driven equivalent of an HTTP handler.
type MessageHandler struct {
	svc *service.InventoryService
}

// NewMessageHandler creates a handler wired with the service
func NewMessageHandler(svc *service.InventoryService) *MessageHandler {
	return &MessageHandler{svc: svc}
}

// Handle processes a single message. Returning an error signals the caller
// to dead-letter the message; returning nil means it was handled successfully.
func (h *MessageHandler) Handle(routingKey string, body []byte) error {
	ctx := context.Background()

	switch routingKey {
	case RoutingKeyOrderCreated:
		return h.handleOrderCreated(ctx, body)
	case RoutingKeyPaymentFailed:
		return h.handlePaymentFailed(ctx, body)
	default:
		log.Printf("Ignoring unknown routing key: %s", routingKey)
		return nil
	}
}

func (h *MessageHandler) handleOrderCreated(ctx context.Context, body []byte) error {
	var order domain.Order
	if err := json.Unmarshal(body, &order); err != nil {
		log.Printf("Failed to parse order.created: %v", err)
		return err // unparseable -> dead-letter
	}

	log.Printf("Received order.created: order %s with %d item(s)", order.ID, len(order.Items))
	return h.svc.ReserveOrder(ctx, order)
}

func (h *MessageHandler) handlePaymentFailed(ctx context.Context, body []byte) error {
	var payment domain.PaymentResult
	if err := json.Unmarshal(body, &payment); err != nil {
		log.Printf("Failed to parse payment.failed: %v", err)
		return err // unparseable -> dead-letter
	}

	log.Printf("Received payment.failed for order %s - restoring stock", payment.OrderID)
	return h.svc.RestoreOrder(ctx, payment)
}
