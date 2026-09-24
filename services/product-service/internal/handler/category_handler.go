package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"product-service/internal/domain"
	"product-service/internal/service"
)

// CategoryHandler handles HTTP requests for categories
type CategoryHandler struct {
	svc *service.CategoryService
}

func NewCategoryHandler(svc *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{svc: svc}
}

type categoryRequest struct {
	Name     string  `json:"name"`
	ParentID *string `json:"parent_id"`
}

// RegisterRoutes attaches category routes
func (h *CategoryHandler) RegisterRoutes(mux *http.ServeMux) {
	// Public
	mux.HandleFunc("GET /categories", h.list)
	// Admin (RBAC enforced at the gateway)
	mux.HandleFunc("POST /admin/categories", h.create)
	mux.HandleFunc("PUT /admin/categories/{id}", h.update)
	mux.HandleFunc("DELETE /admin/categories/{id}", h.delete)
}

func (h *CategoryHandler) list(w http.ResponseWriter, r *http.Request) {
	tree, err := h.svc.List(r.Context())
	if err != nil {
		log.Printf("Failed to list categories: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to list categories")
		return
	}
	writeJSON(w, http.StatusOK, tree)
}

func (h *CategoryHandler) create(w http.ResponseWriter, r *http.Request) {
	var req categoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	cat, err := h.svc.Create(r.Context(), req.Name, req.ParentID)
	if err != nil {
		writeCategoryError(w, err)
		return
	}

	log.Printf("Created category %s (%s)", cat.ID, cat.Name)
	writeJSON(w, http.StatusCreated, cat)
}

func (h *CategoryHandler) update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req categoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	cat, err := h.svc.Update(r.Context(), id, req.Name, req.ParentID)
	if err != nil {
		writeCategoryError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, cat)
}

func (h *CategoryHandler) delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	if err := h.svc.Delete(r.Context(), id); err != nil {
		writeCategoryError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "category deleted"})
}

// writeCategoryError maps category domain errors to HTTP codes
func writeCategoryError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrCategoryNotFound):
		writeError(w, http.StatusNotFound, "category not found")
	case errors.Is(err, domain.ErrCategoryHasChildren):
		writeError(w, http.StatusConflict, "category has children and cannot be deleted")
	case errors.Is(err, domain.ErrCategoryCycle):
		writeError(w, http.StatusBadRequest, "cannot set a category as its own descendant")
	case errors.Is(err, domain.ErrSlugExists):
		writeError(w, http.StatusConflict, "a category with this name already exists")
	case errors.Is(err, domain.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid input")
	default:
		log.Printf("Category error: %v", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}
