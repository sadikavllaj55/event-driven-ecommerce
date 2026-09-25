package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"order-service/internal/domain"
	"order-service/internal/service"
)

// OrderHandler handles HTTP requests for orders
type OrderHandler struct {
	svc *service.OrderService
}

// NewOrderHandler creates a handler wired with the service
func NewOrderHandler(svc *service.OrderService) *OrderHandler {
	return &OrderHandler{svc: svc}
}

// --- Request types (HTTP-specific shapes) ---

type createOrderItemRequest struct {
	ProductID  string `json:"product_id"`
	Quantity   int    `json:"quantity"`
	PriceCents int    `json:"price_cents"`
}

type createOrderRequest struct {
	BuyerID string                   `json:"buyer_id"`
	Items   []createOrderItemRequest `json:"items"`
}

// RegisterRoutes attaches the order routes to the mux
func (h *OrderHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("POST /orders", h.createOrder)
	mux.HandleFunc("GET /orders", h.listOrders)
	mux.HandleFunc("GET /orders/{id}", h.getOrder)
	mux.HandleFunc("GET /admin/stats", h.stats)
}

func (h *OrderHandler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "order-service",
	})
}

func (h *OrderHandler) createOrder(w http.ResponseWriter, r *http.Request) {
	var req createOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Map the HTTP request to domain items
	items := make([]domain.OrderItem, 0, len(req.Items))
	for _, it := range req.Items {
		items = append(items, domain.OrderItem{
			ProductID:  it.ProductID,
			Quantity:   it.Quantity,
			PriceCents: it.PriceCents,
		})
	}

	// Call the service (business logic)
	order, err := h.svc.CreateOrder(context.Background(), req.BuyerID, items)
	if err != nil {
		// Map domain errors to HTTP status codes
		switch {
		case errors.Is(err, domain.ErrNoItems), errors.Is(err, domain.ErrInvalidItem):
			writeError(w, http.StatusBadRequest, err.Error())
		default:
			log.Printf("Failed to create order: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to create order")
		}
		return
	}

	log.Printf("Created order %s with %d item(s), total %d cents",
		order.ID, len(order.Items), order.TotalCents)
	writeJSON(w, http.StatusCreated, order)
}

func (h *OrderHandler) listOrders(w http.ResponseWriter, r *http.Request) {
	// The gateway sets this header from the verified JWT
	buyerID := r.Header.Get("X-User-ID")
	if buyerID == "" {
		writeError(w, http.StatusBadRequest, "missing buyer identity")
		return
	}

	orders, err := h.svc.ListBuyerOrders(r.Context(), buyerID)
	if err != nil {
		log.Printf("Failed to list orders: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to list orders")
		return
	}

	writeJSON(w, http.StatusOK, orders)
}

func (h *OrderHandler) getOrder(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Header.Get("X-User-ID")
	if buyerID == "" {
		writeError(w, http.StatusBadRequest, "missing buyer identity")
		return
	}
	orderID := r.PathValue("id")

	order, err := h.svc.GetOrder(r.Context(), orderID, buyerID)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrOrderNotFound):
			writeError(w, http.StatusNotFound, "order not found")
		case errors.Is(err, domain.ErrForbidden):
			writeError(w, http.StatusForbidden, "not allowed to access this order")
		default:
			log.Printf("Failed to get order: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to get order")
		}
		return
	}

	writeJSON(w, http.StatusOK, order)
}

// --- HTTP helpers ---

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func (h *OrderHandler) stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.Stats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch stats")
		return
	}
	writeJSON(w, http.StatusOK, stats)
}
