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
	return &domain.User{
		ID: id, Name: "Alex Rivera", Email: "alex@example.test", Phone: "+447700900123",
		Username: "alex", Location: "London", Status: domain.UserStatusActive, CreatedAt: time.Now(),
	}, nil
}

func TestPrivateAccountProfile(t *testing.T) {
	mux := http.NewServeMux()
	NewUserHandler(service.NewUserService(&searchRepository{}, nil, nil, nil, nil, nil)).RegisterRoutes(mux)

	response := httptest.NewRecorder()
	mux.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/profile", nil))
	if response.Code == http.StatusOK {
		t.Fatal("account profile must require identity")
	}

	request := httptest.NewRequest(http.MethodGet, "/profile", nil)
	request.Header.Set("X-User-ID", "member")
	response = httptest.NewRecorder()
	mux.ServeHTTP(response, request)
	var profile map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &profile); err != nil {
		t.Fatal(err)
	}
	if response.Code != http.StatusOK || profile["id"] != "member" ||
		profile["email"] != "alex@example.test" || profile["phone"] != "+447700900123" {
		t.Fatalf("unexpected account profile: %s", response.Body)
	}

	response = httptest.NewRecorder()
	mux.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/users/member/profile", nil))
	if strings.Contains(response.Body.String(), "email") || strings.Contains(response.Body.String(), "phone") {
		t.Fatal("public profile leaked contact details")
	}

	for _, body := range []string{`{"email":"changed@example.test"}`, `{"created_at":"2020-01-01"}`, `{"id":"other"}`, `{"profile_verified":true}`} {
		request = httptest.NewRequest(http.MethodPut, "/profile", strings.NewReader(body))
		request.Header.Set("X-User-ID", "member")
		response = httptest.NewRecorder()
		mux.ServeHTTP(response, request)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("read-only field accepted: %s", body)
		}
	}
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
	if len(profiles) != 1 || profiles[0]["name"] != "Alex Rivera" || profiles[0]["username"] != "alex" || len(profiles[0]) != 7 {
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
