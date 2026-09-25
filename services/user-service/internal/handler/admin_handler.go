package handler

import (
	"encoding/json"
	"log"
	"net/http"
)

// RegisterAdminRoutes attaches admin user-management routes
func (h *UserHandler) RegisterAdminRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /admin/users", h.listUsers)
	mux.HandleFunc("PATCH /admin/users/{id}/status", h.updateUserStatus)
	mux.HandleFunc("PATCH /admin/users/{id}/role", h.updateUserRole)
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
