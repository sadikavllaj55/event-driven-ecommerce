package service

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"
	"time"

	"user-service/internal/domain"
	"user-service/internal/repository"
)

type profileRepository struct {
	repository.UserRepository
	users map[string]domain.User
}

func (repo *profileRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	user, found := repo.users[id]
	if !found {
		return nil, domain.ErrUserNotFound
	}
	return &user, nil
}

func (repo *profileRepository) ListProfileUsers(ctx context.Context) ([]domain.User, error) {
	users := make([]domain.User, 0, len(repo.users))
	for _, user := range repo.users {
		users = append(users, user)
	}
	return users, nil
}

func (repo *profileRepository) Create(ctx context.Context, user domain.User, token string) error {
	user.Status = domain.UserStatusActive
	repo.users[user.ID] = user
	return nil
}

func (repo *profileRepository) UpdateStatus(ctx context.Context, id, status string) error {
	user := repo.users[id]
	user.Status = status
	repo.users[id] = user
	return nil
}

func (repo *profileRepository) UpdateBio(ctx context.Context, id, bio string) error {
	user := repo.users[id]
	user.Bio = bio
	repo.users[id] = user
	return nil
}

func (repo *profileRepository) UpdateAvatarURL(ctx context.Context, id, url string) error {
	user := repo.users[id]
	user.AvatarURL = url
	repo.users[id] = user
	return nil
}

type profileSearch struct {
	documents map[string]domain.Profile
	hits      []domain.Profile
	err       error
}

func (search *profileSearch) IndexProfile(ctx context.Context, profile domain.Profile) error {
	if search.err != nil {
		return search.err
	}
	search.documents[profile.ID] = profile
	return nil
}

func (search *profileSearch) DeleteProfile(ctx context.Context, id string) error {
	if search.err != nil {
		return search.err
	}
	delete(search.documents, id)
	return nil
}

func (search *profileSearch) SearchProfiles(ctx context.Context, query string) ([]domain.Profile, error) {
	return search.hits, search.err
}

type profileHasher struct{}

func (profileHasher) Hash(password string) (string, error) { return "hash", nil }
func (profileHasher) Check(password, hash string) error    { return nil }

type profilePublisher struct{}

func (profilePublisher) PublishUserRegistered(id, email, name, token string) error { return nil }

type profileStorage struct{}

func (profileStorage) UploadAvatar(name string, reader io.Reader, size int64, contentType string) (string, error) {
	return "https://example.test/avatar.png", nil
}

func TestMemberIndexLifecycle(t *testing.T) {
	ctx := context.Background()
	repo := &profileRepository{users: map[string]domain.User{
		"active": {ID: "active", Name: "Sadik", Status: domain.UserStatusActive, CreatedAt: time.Now()},
		"banned": {ID: "banned", Name: "Banned", Status: domain.UserStatusBanned},
	}}
	search := &profileSearch{documents: map[string]domain.Profile{"banned": {ID: "banned"}}}
	svc := NewUserService(repo, profileHasher{}, profilePublisher{}, nil, profileStorage{}, search)
	if err := svc.ReindexProfiles(ctx); err != nil {
		t.Fatal(err)
	}
	if len(search.documents) != 1 || search.documents["active"].Name != "Sadik" {
		t.Fatalf("backfill must index active users and delete banned users: %v", search.documents)
	}
	if _, err := svc.UpdateBio(ctx, "active", "New bio"); err != nil {
		t.Fatal(err)
	}
	if search.documents["active"].Bio != "New bio" {
		t.Fatal("bio change was not indexed")
	}
	if _, err := svc.UploadAvatar(ctx, "active", "avatar.png", "image/png", strings.NewReader("image"), 5); err != nil {
		t.Fatal(err)
	}
	if search.documents["active"].AvatarURL != "https://example.test/avatar.png" {
		t.Fatal("avatar change was not indexed")
	}
	if err := svc.SetUserStatus(ctx, "admin", "active", domain.UserStatusBanned); err != nil {
		t.Fatal(err)
	}
	if _, found := search.documents["active"]; found {
		t.Fatal("banned member remains indexed")
	}
	if err := svc.SetUserStatus(ctx, "admin", "active", domain.UserStatusActive); err != nil {
		t.Fatal(err)
	}
	if search.documents["active"].Name != "Sadik" {
		t.Fatal("reactivated member was not indexed")
	}
	user, err := svc.Register(ctx, "new@example.test", "password", "New Member", domain.RoleBuyer)
	if err != nil || search.documents[user.ID].Name != "New Member" {
		t.Fatalf("registration should index the member: user=%v error=%v", user, err)
	}
	search.err = errors.New("Elasticsearch unavailable")
	if _, err := svc.UpdateBio(ctx, "active", "Saved during outage"); err != nil {
		t.Fatalf("database update should survive an index outage: %v", err)
	}
	if _, err := svc.SearchProfiles(ctx, "sa"); err == nil {
		t.Fatal("search failure should not silently fall back to PostgreSQL")
	}
	search.err = nil
	if err := svc.ReindexProfiles(ctx); err != nil {
		t.Fatal(err)
	}
	if search.documents["active"].Bio != "Saved during outage" {
		t.Fatal("reconciliation did not repair missed index update")
	}
}

func TestMemberSearchHidesStaleBannedAndMissingHits(t *testing.T) {
	repo := &profileRepository{users: map[string]domain.User{
		"active": {ID: "active", Name: "Current name", Bio: "Current bio", Status: domain.UserStatusActive},
		"banned": {ID: "banned", Name: "Hidden", Status: domain.UserStatusBanned},
	}}
	search := &profileSearch{hits: []domain.Profile{
		{ID: "active", Name: "Old name"}, {ID: "banned"}, {ID: "missing"},
	}}
	svc := NewUserService(repo, nil, nil, nil, nil, search)
	profiles, err := svc.SearchProfiles(context.Background(), "sa")
	if err != nil || len(profiles) != 1 || profiles[0].Name != "Current name" || profiles[0].Bio != "Current bio" {
		t.Fatalf("expected fresh public profile without stale banned/missing hits: profiles=%v error=%v", profiles, err)
	}
}
