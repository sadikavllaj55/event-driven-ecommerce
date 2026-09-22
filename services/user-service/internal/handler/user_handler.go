package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"user-service/internal/domain"
	"user-service/internal/service"
)

// UserHandler handles HTTP requests for users
type UserHandler struct {
	svc *service.UserService
}

// NewUserHandler creates a handler wired with the service
func NewUserHandler(svc *service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

// --- Request types (HTTP shapes) ---

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterRoutes attaches user routes to the mux
func (h *UserHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("POST /register", h.register)
	mux.HandleFunc("POST /login", h.login)
	mux.HandleFunc("GET /users/{id}", h.getUser)
	mux.HandleFunc("GET /verify", h.verify)
}

func (h *UserHandler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "user-service"})
}

func (h *UserHandler) register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.svc.Register(r.Context(), req.Email, req.Password, req.Name, req.Role)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	log.Printf("Registered user: %s (%s) - verification pending", user.Email, user.Role)
	writeJSON(w, http.StatusCreated, user)
}

func (h *UserHandler) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.svc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	log.Printf("User logged in: %s", user.Email)
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) getUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	user, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) verify(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if err := h.svc.Verify(r.Context(), token); err != nil {
		writeServiceError(w, err)
		return
	}
	log.Printf("User verified with token %s", token)
	writeJSON(w, http.StatusOK, map[string]string{
		"message": "email verified successfully — you can now log in",
	})
}

// --- Error mapping: domain errors → HTTP status codes ---

func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrInvalidInput),
		errors.Is(err, domain.ErrWeakPassword),
		errors.Is(err, domain.ErrInvalidRole):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, domain.ErrEmailExists):
		writeError(w, http.StatusConflict, "email already registered")
	case errors.Is(err, domain.ErrInvalidCredentials):
		writeError(w, http.StatusUnauthorized, "invalid credentials")
	case errors.Is(err, domain.ErrEmailNotVerified):
		writeError(w, http.StatusForbidden, "please verify your email before logging in")
	case errors.Is(err, domain.ErrUserNotFound):
		writeError(w, http.StatusNotFound, "user not found")
	case errors.Is(err, domain.ErrInvalidToken):
		writeError(w, http.StatusNotFound, "invalid or expired verification token")
	default:
		log.Printf("Unexpected error: %v", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
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
