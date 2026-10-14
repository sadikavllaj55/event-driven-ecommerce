package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"user-service/internal/domain"
	"user-service/internal/repository"
	"user-service/internal/service"
)

type verificationRepository struct {
	repository.UserRepository
	verified bool
}

type verificationSearch struct {
	service.MemberSearch
}

func (search verificationSearch) IndexProfile(ctx context.Context, profile domain.Profile) error {
	return nil
}

func (repo *verificationRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	if id != "admin" && id != "member" {
		return nil, domain.ErrUserNotFound
	}
	role := domain.RoleBuyer
	if id == "admin" {
		role = domain.RoleAdmin
	}
	return &domain.User{ID: id, Role: role, Status: domain.UserStatusActive, ProfileVerified: repo.verified}, nil
}

func (repo *verificationRepository) UpdateProfileVerification(ctx context.Context, id string, verified bool) error {
	if id != "member" {
		return domain.ErrUserNotFound
	}
	repo.verified = verified
	return nil
}

func TestAdminProfileVerification(t *testing.T) {
	repo := &verificationRepository{}
	mux := http.NewServeMux()
	NewUserHandler(service.NewUserService(repo, nil, nil, nil, nil, verificationSearch{})).RegisterAdminRoutes(mux)
	for _, test := range []struct {
		actor, target, body string
		status              int
	}{
		{"", "member", `{"profile_verified":true}`, 401},
		{"member", "member", `{"profile_verified":true}`, 403},
		{"admin", "admin", `{"profile_verified":true}`, 403},
		{"admin", "missing", `{"profile_verified":true}`, 404},
		{"admin", "member", `{}`, 400},
		{"admin", "member", `{"profile_verified":null}`, 400},
		{"admin", "member", `{"profile_verified":"true"}`, 400},
		{"admin", "member", `{"profile_verified":true,"email":"bad"}`, 400},
		{"admin", "member", `{"profile_verified":true}{}`, 400},
		{"admin", "member", `{"profile_verified":true}`, 200},
		{"admin", "member", `{"profile_verified":false}`, 200},
	} {
		request := httptest.NewRequest(http.MethodPatch, "/admin/users/"+test.target+"/profile-verification", strings.NewReader(test.body))
		request.Header.Set("X-User-ID", test.actor)
		response := httptest.NewRecorder()
		mux.ServeHTTP(response, request)
		if response.Code != test.status {
			t.Fatalf("actor=%q target=%q body=%s: status=%d response=%s", test.actor, test.target, test.body, response.Code, response.Body)
		}
	}
	if repo.verified {
		t.Fatal("revocation was not persisted")
	}
}
