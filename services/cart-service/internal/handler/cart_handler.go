package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"cart-service/internal/domain"
	"cart-service/internal/service"
)

// CartHandler handles HTTP requests for the cart
type CartHandler struct {
	svc *service.CartService
}

func NewCartHandler(svc *service.CartService) *CartHandler {
	return &CartHandler{svc: svc}
}

type addItemRequest struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

// RegisterRoutes attaches cart routes
func (h *CartHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("GET /cart", h.getCart)
	mux.HandleFunc("POST /cart/items", h.addItem)
	mux.HandleFunc("DELETE /cart/items/{productId}", h.removeItem)
	mux.HandleFunc("POST /cart/checkout", h.checkout)
}

func (h *CartHandler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "cart-service"})
}

func (h *CartHandler) getCart(w http.ResponseWriter, r *http.Request) {
	buyerID, ok := buyerFromHeader(w, r)
	if !ok {
		return
	}
	cart, err := h.svc.GetCart(buyerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch cart")
		return
	}
	writeJSON(w, http.StatusOK, cart)
}

func (h *CartHandler) addItem(w http.ResponseWriter, r *http.Request) {
	buyerID, ok := buyerFromHeader(w, r)
	if !ok {
		return
	}

	var req addItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	cart, err := h.svc.AddItem(buyerID, req.ProductID, req.Quantity)
	if err != nil {
		writeCartError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, cart)
}

func (h *CartHandler) removeItem(w http.ResponseWriter, r *http.Request) {
	buyerID, ok := buyerFromHeader(w, r)
	if !ok {
		return
	}
	cart, err := h.svc.RemoveItem(buyerID, r.PathValue("productId"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to remove item")
		return
	}
	writeJSON(w, http.StatusOK, cart)
}

func (h *CartHandler) checkout(w http.ResponseWriter, r *http.Request) {
	buyerID, ok := buyerFromHeader(w, r)
	if !ok {
		return
	}

	body, status, err := h.svc.Checkout(buyerID)
	if err != nil {
		writeCartError(w, err)
		return
	}

	// Forward the Order Service's response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(body)
}

// --- Helpers ---

// buyerFromHeader extracts the buyer ID from the X-User-ID header (set by the gateway)
func buyerFromHeader(w http.ResponseWriter, r *http.Request) (string, bool) {
	buyerID := r.Header.Get("X-User-ID")
	if buyerID == "" {
		writeError(w, http.StatusBadRequest, "missing buyer identity")
		return "", false
	}
	return buyerID, true
}

// writeCartError maps domain errors to HTTP codes
func writeCartError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrInvalidItem):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, domain.ErrCartEmpty):
		writeError(w, http.StatusBadRequest, "cart is empty")
	case errors.Is(err, domain.ErrProductNotFound):
		writeError(w, http.StatusNotFound, "product not found")
	default:
		log.Printf("Cart error: %v", err)
		writeError(w, http.StatusBadGateway, "cart operation failed")
	}
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
