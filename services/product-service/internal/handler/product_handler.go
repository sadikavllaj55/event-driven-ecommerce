package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"product-service/internal/domain"
	"product-service/internal/service"
)

// ProductHandler handles HTTP requests for products
type ProductHandler struct {
	svc *service.ProductService
}

func NewProductHandler(svc *service.ProductService) *ProductHandler {
	return &ProductHandler{svc: svc}
}

// --- Request types (HTTP shapes) — price is in DOLLARS ---

type productRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	ImageURL    string  `json:"image_url"`
	Gender      string  `json:"gender"`
	Brand       string  `json:"brand"`
	ModelCode   string  `json:"model_code"`
	Condition   string  `json:"condition"`
	Material    string  `json:"material"`
	Color       string  `json:"color"`
	Size        string  `json:"size"`
	CategoryID  *string `json:"category_id"`
}
type statusRequest struct {
	Status string `json:"status"`
}

// toProductInput maps an HTTP request to the service input (shared by create/update)
func (req productRequest) toProductInput(id, sellerID string) service.ProductInput {
	return service.ProductInput{
		ID:           id,
		SellerID:     sellerID,
		Name:         req.Name,
		Description:  req.Description,
		PriceDollars: req.Price,
		Stock:        req.Stock,
		ImageURL:     req.ImageURL,
		Gender:       req.Gender,
		Brand:        req.Brand,
		ModelCode:    req.ModelCode,
		Condition:    req.Condition,
		Material:     req.Material,
		Color:        req.Color,
		Size:         req.Size,
		CategoryID:   req.CategoryID,
	}
}

// RegisterRoutes attaches product routes to the mux
func (h *ProductHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("GET /products", h.list)
	mux.HandleFunc("GET /products/search", h.search)
	mux.HandleFunc("GET /products/{id}", h.get)
	mux.HandleFunc("POST /products", h.create)
	mux.HandleFunc("GET /products/mine", h.listMine)
	mux.HandleFunc("PUT /products/{id}", h.update)
	mux.HandleFunc("DELETE /products/{id}", h.delete)
	mux.HandleFunc("PATCH /products/{id}/status", h.updateStatus)
	// Image gallery
	mux.HandleFunc("POST /products/{id}/images", h.uploadImage)
	mux.HandleFunc("GET /products/{id}/images", h.listImages)
	mux.HandleFunc("DELETE /products/{id}/images/{imageId}", h.deleteImage)
}

func (h *ProductHandler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "product-service"})
}

func (h *ProductHandler) search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	filters := service.SearchFilters{
		Query:      q.Get("q"),
		CategoryID: q.Get("category"),
		Brand:      q.Get("brand"),
		Condition:  q.Get("condition"),
		Gender:     q.Get("gender"),
		MinPrice:   atoiOrZero(q.Get("min_price")),
		MaxPrice:   atoiOrZero(q.Get("max_price")),
	}

	results, err := h.svc.Search(r.Context(), filters)
	if err != nil {
		log.Printf("Search failed: %v", err)
		writeError(w, http.StatusInternalServerError, "search failed")
		return
	}

	writeJSON(w, http.StatusOK, results)
}

// atoiOrZero converts a string to int, returning 0 if empty/invalid
func atoiOrZero(s string) int {
	n, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return n
}

func (h *ProductHandler) list(w http.ResponseWriter, r *http.Request) {
	products, err := h.svc.List(r.Context())
	if err != nil {
		log.Printf("Failed to list products: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to list products")
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (h *ProductHandler) listMine(w http.ResponseWriter, r *http.Request) {
	sellerID := sellerFromHeader(w, r)
	if sellerID == "" {
		return
	}

	products, err := h.svc.ListMine(r.Context(), sellerID)
	if err != nil {
		writeProductError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (h *ProductHandler) get(w http.ResponseWriter, r *http.Request) {
	product, err := h.svc.Get(r.Context(), r.PathValue("id"))
	if err != nil {
		writeProductError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, product)
}

func (h *ProductHandler) create(w http.ResponseWriter, r *http.Request) {
	sellerID := sellerFromHeader(w, r)
	if sellerID == "" {
		return
	}

	var req productRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	product, err := h.svc.Create(r.Context(), req.toProductInput("", sellerID))

	if err != nil {
		writeProductError(w, err)
		return
	}

	log.Printf("Created product %s by seller %s", product.ID, product.SellerID)
	writeJSON(w, http.StatusCreated, product)
}

func (h *ProductHandler) update(w http.ResponseWriter, r *http.Request) {
	sellerID := sellerFromHeader(w, r)
	if sellerID == "" {
		return
	}

	var req productRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	product, err := h.svc.Update(r.Context(), req.toProductInput(r.PathValue("id"), sellerID))

	if err != nil {
		writeProductError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, product)
}

func (h *ProductHandler) updateStatus(w http.ResponseWriter, r *http.Request) {
	sellerID := sellerFromHeader(w, r)
	if sellerID == "" {
		return
	}

	var req statusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	product, err := h.svc.SetStatus(r.Context(), r.PathValue("id"), sellerID, req.Status)
	if err != nil {
		writeProductError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, product)
}

func (h *ProductHandler) delete(w http.ResponseWriter, r *http.Request) {
	sellerID := sellerFromHeader(w, r)
	if sellerID == "" {
		return
	}

	if err := h.svc.Delete(r.Context(), r.PathValue("id"), sellerID); err != nil {
		writeProductError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "product deleted"})
}

// --- Helpers ---

// sellerFromHeader reads the seller identity from the gateway-set X-User-ID header
func sellerFromHeader(w http.ResponseWriter, r *http.Request) string {
	sellerID := r.Header.Get("X-User-ID")
	if sellerID == "" {
		writeError(w, http.StatusBadRequest, "missing seller identity")
		return ""
	}
	return sellerID
}

// writeProductError maps domain errors to HTTP status codes
func writeProductError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrProductNotFound):
		writeError(w, http.StatusNotFound, "product not found or not owned by you")
	case errors.Is(err, domain.ErrCategoryNotFound):
		writeError(w, http.StatusBadRequest, "category not found")
	case errors.Is(err, domain.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid product input")
	case errors.Is(err, domain.ErrInvalidStatus):
		writeError(w, http.StatusBadRequest, "status must be 'active' or 'inactive'")
	default:
		log.Printf("Unexpected error: %v", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
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
