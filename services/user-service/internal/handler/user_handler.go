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

func (h *UserHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("POST /register", h.register)
	mux.HandleFunc("POST /login", h.login)
	mux.HandleFunc("GET /users/{id}", h.getUser)
	mux.HandleFunc("GET /verify", h.verify)

	// 2FA
	mux.HandleFunc("POST /2fa/setup", h.setup2FA)
	mux.HandleFunc("POST /2fa/enable", h.enable2FA)
	mux.HandleFunc("POST /login/2fa", h.login2FA)
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

type enable2FARequest struct {
	Code string `json:"code"`
}

type login2FARequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

// setup2FA generates a TOTP secret and returns the otpauth URL (for the QR).
// Identity comes from the gateway-verified X-User-ID header.
func (h *UserHandler) setup2FA(w http.ResponseWriter, r *http.Request) {
	userID := userFromHeader(w, r)
	if userID == "" {
		return
	}

	otpauthURL, err := h.svc.Setup2FA(r.Context(), userID)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"otpauth_url": otpauthURL,
		"message":     "scan this URL with your authenticator app, then call /2fa/enable with a code",
	})
}

// enable2FA verifies a code and enables 2FA
func (h *UserHandler) enable2FA(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		writeError(w, http.StatusBadRequest, "missing user identity")
		return
	}

	var req enable2FARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.svc.Enable2FA(r.Context(), userID, req.Code); err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "2FA enabled successfully"})
}

// login2FA is step 2 of login — verifies the TOTP code
func (h *UserHandler) login2FA(w http.ResponseWriter, r *http.Request) {
	var req login2FARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.svc.Verify2FALogin(r.Context(), req.Email, req.Code)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, user)
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
	case errors.Is(err, domain.Err2FARequired):
		// Special: 428 signals the client to provide a 2FA code
		writeError(w, http.StatusPreconditionRequired, "2FA code required")
	case errors.Is(err, domain.ErrInvalid2FACode):
		writeError(w, http.StatusUnauthorized, "invalid 2FA code")
	case errors.Is(err, domain.Err2FANotEnabled):
		writeError(w, http.StatusBadRequest, "2FA is not enabled")
	case errors.Is(err, domain.Err2FAAlreadyEnabled):
		writeError(w, http.StatusConflict, "2FA is already enabled")
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

// userFromHeader reads the user identity from the gateway-set X-User-ID header
func userFromHeader(w http.ResponseWriter, r *http.Request) string {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		writeError(w, http.StatusBadRequest, "missing user identity")
		return ""
	}
	return userID
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
