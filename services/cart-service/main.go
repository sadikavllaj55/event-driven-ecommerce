package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
)

// AddItemRequest is the body for adding an item to the cart
type AddItemRequest struct {
	ProductID  string `json:"product_id"`
	Quantity   int    `json:"quantity"`
	PriceCents int    `json:"price_cents"`
}

// --- Types for creating an order at checkout ---

type orderItem struct {
	ProductID  string `json:"product_id"`
	Quantity   int    `json:"quantity"`
	PriceCents int    `json:"price_cents"`
}

type createOrderRequest struct {
	BuyerID string      `json:"buyer_id"`
	Items   []orderItem `json:"items"`
}

var store *CartStore
var orderServiceURL string

func main() {
	cfg := LoadConfig()
	orderServiceURL = cfg.OrderServiceURL

	s, err := NewCartStore(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer s.Close()
	store = s
	log.Println("Connected to Redis")

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "cart-service",
		})
	})

	// View cart
	mux.HandleFunc("GET /cart/{buyerId}", func(w http.ResponseWriter, r *http.Request) {
		buyerID := r.PathValue("buyerId")
		cart, err := store.GetCart(buyerID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to fetch cart")
			return
		}
		writeJSON(w, http.StatusOK, cart)
	})

	// Add item to cart
	mux.HandleFunc("POST /cart/{buyerId}/items", func(w http.ResponseWriter, r *http.Request) {
		buyerID := r.PathValue("buyerId")

		var req AddItemRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.ProductID == "" || req.Quantity <= 0 {
			writeError(w, http.StatusBadRequest, "product_id and quantity (>0) are required")
			return
		}

		cart, err := store.AddItem(buyerID, CartItem{
			ProductID:  req.ProductID,
			Quantity:   req.Quantity,
			PriceCents: req.PriceCents,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to add item")
			return
		}
		writeJSON(w, http.StatusOK, cart)
	})

	// Remove item from cart
	mux.HandleFunc("DELETE /cart/{buyerId}/items/{productId}", func(w http.ResponseWriter, r *http.Request) {
		buyerID := r.PathValue("buyerId")
		productID := r.PathValue("productId")

		cart, err := store.RemoveItem(buyerID, productID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to remove item")
			return
		}
		writeJSON(w, http.StatusOK, cart)
	})

	// Checkout — turn the cart into an order
	mux.HandleFunc("POST /cart/{buyerId}/checkout", func(w http.ResponseWriter, r *http.Request) {
		buyerID := r.PathValue("buyerId")

		cart, err := store.GetCart(buyerID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to fetch cart")
			return
		}
		if len(cart.Items) == 0 {
			writeError(w, http.StatusBadRequest, "cart is empty")
			return
		}

		// Build the order request from the cart
		items := make([]orderItem, 0, len(cart.Items))
		for _, it := range cart.Items {
			items = append(items, orderItem{
				ProductID:  it.ProductID,
				Quantity:   it.Quantity,
				PriceCents: it.PriceCents,
			})
		}
		orderReq := createOrderRequest{BuyerID: buyerID, Items: items}

		// Call the Order Service to create the order
		orderResp, status, err := createOrder(orderReq)
		if err != nil {
			log.Printf("Checkout failed calling order service: %v", err)
			writeError(w, http.StatusBadGateway, "failed to create order")
			return
		}

		// If the order was created, clear the cart
		if status == http.StatusCreated {
			if err := store.ClearCart(buyerID); err != nil {
				log.Printf("Warning: failed to clear cart after checkout: %v", err)
			}
		}

		// Forward the Order Service's response back to the client
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		w.Write(orderResp)
	})

	port := ":" + cfg.Port
	log.Printf("Cart Service running on %s", port)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal(err)
	}
}

// createOrder calls the Order Service to create an order from the cart
func createOrder(req createOrderRequest) ([]byte, int, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, 0, err
	}

	resp, err := http.Post(orderServiceURL+"/orders", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	respBody := new(bytes.Buffer)
	respBody.ReadFrom(resp.Body)

	return respBody.Bytes(), resp.StatusCode, nil
}

// --- Helpers ---

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
