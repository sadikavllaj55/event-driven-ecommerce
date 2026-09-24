package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

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

// RegisterRoutes attaches product routes to the mux
func (h *ProductHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("GET /products", h.list)
	mux.HandleFunc("GET /products/search", h.search)
	mux.HandleFunc("GET /products/{id}", h.get)
	mux.HandleFunc("POST /products", h.create)
	mux.HandleFunc("PUT /products/{id}", h.update)
	mux.HandleFunc("DELETE /products/{id}", h.delete)
	// Image gallery
	mux.HandleFunc("POST /products/{id}/images", h.uploadImage)
	mux.HandleFunc("GET /products/{id}/images", h.listImages)
	mux.HandleFunc("DELETE /products/{id}/images/{imageId}", h.deleteImage)
}

func (h *ProductHandler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "product-service"})
}

func (h *ProductHandler) search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")

	results, err := h.svc.Search(r.Context(), query)
	if err != nil {
		log.Printf("Search failed: %v", err)
		writeError(w, http.StatusInternalServerError, "search failed")
		return
	}

	writeJSON(w, http.StatusOK, results)
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

	product, err := h.svc.Create(r.Context(), service.CreateInput{
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
	})

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

	product, err := h.svc.Update(r.Context(), service.UpdateInput{
		ID:           r.PathValue("id"),
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
	})

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

// uploadImage handles multipart file upload for a product's gallery
func (h *ProductHandler) uploadImage(w http.ResponseWriter, r *http.Request) {
	sellerID := sellerFromHeader(w, r)
	if sellerID == "" {
		return
	}
	productID := r.PathValue("id")

	// Limit upload size to 5 MB
	const maxUploadSize = 5 << 20 // 5 MB
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// Parse the multipart form
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or invalid form (max 5MB)")
		return
	}

	// Get the uploaded file (form field name: "image")
	file, header, err := r.FormFile("image")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing 'image' file field")
		return
	}
	defer file.Close()

	// Validate content type (only images)
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		writeError(w, http.StatusBadRequest, "only image files are allowed")
		return
	}

	img, err := h.svc.AddProductImage(
		r.Context(),
		productID, sellerID,
		header.Filename, contentType,
		file, header.Size,
	)
	if err != nil {
		writeImageError(w, err)
		return
	}

	log.Printf("Uploaded image %s for product %s", img.ID, productID)
	writeJSON(w, http.StatusCreated, img)
}

// listImages returns a product's image gallery (public)
func (h *ProductHandler) listImages(w http.ResponseWriter, r *http.Request) {
	productID := r.PathValue("id")
	images, err := h.svc.ListProductImages(r.Context(), productID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list images")
		return
	}
	writeJSON(w, http.StatusOK, images)
}

// deleteImage removes an image from a product's gallery
func (h *ProductHandler) deleteImage(w http.ResponseWriter, r *http.Request) {
	sellerID := sellerFromHeader(w, r)
	if sellerID == "" {
		return
	}
	productID := r.PathValue("id")
	imageID := r.PathValue("imageId")

	if err := h.svc.DeleteProductImage(r.Context(), imageID, productID, sellerID); err != nil {
		writeImageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "image deleted"})
}

// writeImageError maps image/domain errors to HTTP status codes
func writeImageError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrProductNotFound):
		writeError(w, http.StatusNotFound, "product or image not found, or not owned by you")
	case errors.Is(err, domain.ErrMaxImagesReached):
		writeError(w, http.StatusBadRequest, "maximum images per product reached")
	default:
		log.Printf("Image error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to process image")
	}
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
