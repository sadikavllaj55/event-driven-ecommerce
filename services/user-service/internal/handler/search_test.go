package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"user-service/internal/domain"
	"user-service/internal/repository"
	"user-service/internal/service"
)

type searchRepository struct {
	repository.UserRepository
}

func (repo *searchRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	return &domain.User{ID: id, Name: "Alex Rivera", Status: domain.UserStatusActive, CreatedAt: time.Now()}, nil
}

type memberSearch struct {
	service.MemberSearch
	query string
	calls int
}

func (search *memberSearch) SearchProfiles(ctx context.Context, query string) ([]domain.Profile, error) {
	search.query = query
	search.calls++
	return []domain.Profile{{ID: "member-1", Name: "Alex Rivera", CreatedAt: time.Now()}}, nil
}

func TestSearchProfiles(t *testing.T) {
	search := &memberSearch{}
	mux := http.NewServeMux()
	NewUserHandler(service.NewUserService(&searchRepository{}, nil, nil, nil, nil, search)).RegisterRoutes(mux)

	response := httptest.NewRecorder()
	mux.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/users/search?q=%20Alex%20", nil))
	if response.Code != http.StatusOK || search.query != "Alex" {
		t.Fatalf("status=%d query=%q body=%s", response.Code, search.query, response.Body.String())
	}
	var profiles []map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &profiles); err != nil {
		t.Fatal(err)
	}
	if len(profiles) != 1 || profiles[0]["name"] != "Alex Rivera" || len(profiles[0]) != 5 {
		t.Fatalf("expected only public profile fields, got %v", profiles)
	}

	response = httptest.NewRecorder()
	mux.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/users/search?q=%20", nil))
	if response.Code != http.StatusOK || strings.TrimSpace(response.Body.String()) != "[]" || search.calls != 1 {
		t.Fatalf("empty query should not search: status=%d body=%s calls=%d", response.Code, response.Body.String(), search.calls)
	}

	response = httptest.NewRecorder()
	mux.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/users/search?q="+strings.Repeat("a", 101), nil))
	if response.Code != http.StatusBadRequest || search.calls != 1 {
		t.Fatalf("long query should be rejected: status=%d calls=%d", response.Code, search.calls)
	}
}
