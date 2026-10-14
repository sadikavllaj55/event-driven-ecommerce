package handler

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
)

// RegisterAdminRoutes attaches admin user-management routes
func (h *UserHandler) RegisterAdminRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /admin/users", h.listUsers)
	mux.HandleFunc("PATCH /admin/users/{id}/status", h.updateUserStatus)
	mux.HandleFunc("PATCH /admin/users/{id}/role", h.updateUserRole)
	mux.HandleFunc("PATCH /admin/users/{id}/profile-verification", h.updateProfileVerification)
	mux.HandleFunc("GET /admin/stats", h.stats)

}

func (h *UserHandler) listUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.svc.ListUsers(r.Context())
	if err != nil {
		log.Printf("Failed to list users: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to list users")
		return
	}
	writeJSON(w, http.StatusOK, users)
}

type statusRequest struct {
	Status string `json:"status"`
}

func (h *UserHandler) updateUserStatus(w http.ResponseWriter, r *http.Request) {
	adminID := r.Header.Get("X-User-ID")
	targetID := r.PathValue("id")

	var req statusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.svc.SetUserStatus(r.Context(), adminID, targetID, req.Status); err != nil {
		writeServiceError(w, err)
		return
	}

	log.Printf("Admin %s set user %s status to %s", adminID, targetID, req.Status)
	writeJSON(w, http.StatusOK, map[string]string{"message": "user status updated"})
}

type roleRequest struct {
	Role string `json:"role"`
}

func (h *UserHandler) updateUserRole(w http.ResponseWriter, r *http.Request) {
	adminID := r.Header.Get("X-User-ID")
	targetID := r.PathValue("id")

	var req roleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.svc.SetUserRole(r.Context(), adminID, targetID, req.Role); err != nil {
		writeServiceError(w, err)
		return
	}

	log.Printf("Admin %s set user %s role to %s", adminID, targetID, req.Role)
	writeJSON(w, http.StatusOK, map[string]string{"message": "user role updated"})
}

func (h *UserHandler) stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.Stats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch stats")
		return
	}

	writeJSON(w, http.StatusOK, stats)
}

func (h *UserHandler) updateProfileVerification(w http.ResponseWriter, r *http.Request) {
	adminID := r.Header.Get("X-User-ID")
	if adminID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var req struct {
		Verified *bool `json:"profile_verified"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil || req.Verified == nil {
		writeError(w, http.StatusBadRequest, "profile_verified must be a boolean")
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	targetID := r.PathValue("id")
	if err := h.svc.SetProfileVerification(r.Context(), adminID, targetID, *req.Verified); err != nil {
		writeServiceError(w, err)
		return
	}
	log.Printf("Admin %s set user %s profile verification to %t", adminID, targetID, *req.Verified)
	writeJSON(w, http.StatusOK, map[string]bool{"profile_verified": *req.Verified})
}
