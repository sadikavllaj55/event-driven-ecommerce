package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// --- Request/response types ---

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func main() {
	cfg := LoadConfig()

	db, err := NewDB(cfg.DBURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	publisher, err := NewPublisher(cfg.RabbitURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer publisher.Close()

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "user-service",
		})
	})

	// Register a new user
	mux.HandleFunc("POST /register", func(w http.ResponseWriter, r *http.Request) {
		var req RegisterRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		// Validate input
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))
		if req.Email == "" || req.Password == "" || req.Name == "" {
			writeError(w, http.StatusBadRequest, "email, password, and name are required")
			return
		}
		if len(req.Password) < 6 {
			writeError(w, http.StatusBadRequest, "password must be at least 6 characters")
			return
		}

		// Default role to "buyer" if not provided
		role := req.Role
		if role == "" {
			role = "buyer"
		}
		if role != "buyer" && role != "seller" {
			writeError(w, http.StatusBadRequest, "role must be 'buyer' or 'seller'")
			return
		}

		// Hash the password
		// Hash the password
		hash, err := HashPassword(req.Password)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to process password")
			return
		}

		// Generate a verification token
		verificationToken := uuid.NewString()

		// Create the user (unverified)
		user, err := db.CreateUser(req.Email, hash, req.Name, role, verificationToken)
		if err != nil {
			if errors.Is(err, ErrEmailExists) {
				writeError(w, http.StatusConflict, "email already registered")
				return
			}
			log.Printf("Failed to create user: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to create user")
			return
		}

		// Publish user.registered event (Notification Service sends the email)
		if err := publisher.PublishUserRegistered(UserRegisteredEvent{
			UserID:            user.ID,
			Email:             user.Email,
			Name:              user.Name,
			VerificationToken: verificationToken,
		}); err != nil {
			log.Printf("Warning: failed to publish user.registered: %v", err)
			// Don't fail registration if the event fails — user is still created
		}

		log.Printf("Registered user: %s (%s) - verification pending", user.Email, user.Role)
		writeJSON(w, http.StatusCreated, user)
	})

	// Login — verifies credentials
	mux.HandleFunc("POST /login", func(w http.ResponseWriter, r *http.Request) {
		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		user, err := db.GetUserByEmail(req.Email)
		if err != nil {
			// Same message whether user missing or password wrong (security)
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}

		if err := CheckPassword(req.Password, user.PasswordHash); err != nil {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}

		log.Printf("User logged in: %s", user.Email)
		writeJSON(w, http.StatusOK, user)
	})

	// Verify email — user clicks the link from their email
	mux.HandleFunc("GET /verify", func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		if token == "" {
			writeError(w, http.StatusBadRequest, "token is required")
			return
		}

		if err := db.VerifyUser(token); err != nil {
			if errors.Is(err, ErrUserNotFound) {
				writeError(w, http.StatusNotFound, "invalid or expired verification token")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to verify")
			return
		}

		log.Printf("User verified with token %s", token)
		writeJSON(w, http.StatusOK, map[string]string{
			"message": "email verified successfully — you can now log in",
		})
	})

	// Get profile by ID
	mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")

		user, err := db.GetUserByID(id)
		if err != nil {
			if errors.Is(err, ErrUserNotFound) {
				writeError(w, http.StatusNotFound, "user not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to fetch user")
			return
		}

		writeJSON(w, http.StatusOK, user)
	})

	port := ":" + cfg.Port
	log.Printf("User Service running on %s", port)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal(err)
	}
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
