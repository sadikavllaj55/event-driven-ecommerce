package handler

import (
	"errors"
	"log"
	"net/http"

	"product-service/internal/domain"
)

// RegisterFavoriteRoutes attaches favorites routes
func (h *ProductHandler) RegisterFavoriteRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /favorites", h.listFavorites)
	mux.HandleFunc("POST /favorites/{productId}", h.addFavorite)
	mux.HandleFunc("DELETE /favorites/{productId}", h.removeFavorite)
}

func (h *ProductHandler) listFavorites(w http.ResponseWriter, r *http.Request) {
	userID := sellerFromHeader(w, r) // reads X-User-ID
	if userID == "" {
		return
	}

	products, err := h.svc.ListFavorites(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list favorites")
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (h *ProductHandler) addFavorite(w http.ResponseWriter, r *http.Request) {
	userID := sellerFromHeader(w, r)
	if userID == "" {
		return
	}

	if err := h.svc.AddFavorite(r.Context(), userID, r.PathValue("productId")); err != nil {
		writeFavoriteError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"message": "added to favorites"})
}

func (h *ProductHandler) removeFavorite(w http.ResponseWriter, r *http.Request) {
	userID := sellerFromHeader(w, r)
	if userID == "" {
		return
	}

	if err := h.svc.RemoveFavorite(r.Context(), userID, r.PathValue("productId")); err != nil {
		writeFavoriteError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "removed from favorites"})
}

func writeFavoriteError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrProductNotFound):
		writeError(w, http.StatusNotFound, "product not found")
	case errors.Is(err, domain.ErrNotFavorited):
		writeError(w, http.StatusNotFound, "product not in favorites")
	default:
		log.Printf("Favorite error: %v", err)
		writeError(w, http.StatusInternalServerError, "favorite operation failed")
	}
}
