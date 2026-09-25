package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"product-service/internal/service"
)

// SettingsHandler handles admin settings endpoints
type SettingsHandler struct {
	svc *service.SettingsService
}

func NewSettingsHandler(svc *service.SettingsService) *SettingsHandler {
	return &SettingsHandler{svc: svc}
}

type settingRequest struct {
	Value string `json:"value"`
}

func (h *SettingsHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /admin/settings", h.list)
	mux.HandleFunc("PUT /admin/settings/{key}", h.update)
	mux.HandleFunc("GET /admin/stats", h.stats)
}

func (h *SettingsHandler) list(w http.ResponseWriter, r *http.Request) {
	settings, err := h.svc.List(r.Context())
	if err != nil {
		log.Printf("Failed to list settings: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to list settings")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (h *SettingsHandler) update(w http.ResponseWriter, r *http.Request) {
	key := r.PathValue("key")

	var req settingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	setting, err := h.svc.Set(r.Context(), key, req.Value)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid setting")
		return
	}

	log.Printf("Setting updated: %s = %s", setting.Key, setting.Value)
	writeJSON(w, http.StatusOK, setting)
}

func (h *SettingsHandler) stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.ProductStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch stats")
		return
	}
	writeJSON(w, http.StatusOK, stats)
}
