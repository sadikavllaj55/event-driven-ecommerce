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
	for _, existing := range repo.users {
		if existing.Email == user.Email {
			return domain.ErrEmailExists
		}
		if existing.Username != "" && strings.EqualFold(existing.Username, user.Username) {
			return domain.ErrUsernameExists
		}
	}
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

func (repo *profileRepository) UpdateProfileVerification(ctx context.Context, id string, verified bool) error {
	user, found := repo.users[id]
	if !found {
		return domain.ErrUserNotFound
	}
	user.ProfileVerified = verified
	repo.users[id] = user
	return nil
}

func TestProfileVerification(t *testing.T) {
	ctx := context.Background()
	repo := &profileRepository{users: map[string]domain.User{
		"admin":        {ID: "admin", Role: domain.RoleAdmin, Status: domain.UserStatusActive},
		"member":       {ID: "member", Role: domain.RoleBuyer, Status: domain.UserStatusActive, Verified: true},
		"banned-admin": {ID: "banned-admin", Role: domain.RoleAdmin, Status: domain.UserStatusBanned},
	}}
	search := &profileSearch{documents: map[string]domain.Profile{}}
	svc := NewUserService(repo, nil, nil, nil, nil, search)
	for _, verified := range []bool{true, true, false, false} {
		if err := svc.SetProfileVerification(ctx, "admin", "member", verified); err != nil {
			t.Fatal(err)
		}
		public, err := svc.GetProfile(ctx, "member")
		if err != nil {
			t.Fatal(err)
		}
		private, err := svc.GetAccountProfile(ctx, "member")
		if err != nil {
			t.Fatal(err)
		}
		if public.ProfileVerified != verified || private.ProfileVerified != verified ||
			search.documents["member"].ProfileVerified != verified || !repo.users["member"].Verified {
			t.Fatal("verification must persist, propagate publicly, and leave email verification unchanged")
		}
	}
	for _, actor := range []string{"member", "banned-admin", "missing", ""} {
		if err := svc.SetProfileVerification(ctx, actor, "member", true); !errors.Is(err, domain.ErrAdminRequired) {
			t.Fatalf("expected forbidden for %q, got %v", actor, err)
		}
	}
	if err := svc.SetProfileVerification(ctx, "admin", "admin", true); !errors.Is(err, domain.ErrCannotSelfModify) {
		t.Fatalf("expected self-verification rejection, got %v", err)
	}
	if err := svc.SetProfileVerification(ctx, "admin", "missing", true); !errors.Is(err, domain.ErrUserNotFound) {
		t.Fatalf("expected missing target rejection, got %v", err)
	}
}

func (repo *profileRepository) UpdateBio(ctx context.Context, id, bio string) error {
	user := repo.users[id]
	user.Bio = bio
	repo.users[id] = user
	return nil
}

func (repo *profileRepository) UpdateProfile(ctx context.Context, id string, update domain.ProfileUpdate) error {
	user, found := repo.users[id]
	if !found {
		return domain.ErrUserNotFound
	}
	if update.Username != nil && *update.Username != "" {
		for otherID, other := range repo.users {
			if otherID != id && strings.EqualFold(other.Username, *update.Username) {
				return domain.ErrUsernameExists
			}
		}
	}
	for _, field := range []struct{ source, target *string }{
		{update.Name, &user.Name}, {update.Username, &user.Username},
		{update.Phone, &user.Phone}, {update.Location, &user.Location},
		{update.Bio, &user.Bio},
	} {
		if field.source != nil {
			*field.target = *field.source
		}
	}
	repo.users[id] = user
	return nil
}

func TestUpdateAccountProfile(t *testing.T) {
	repo := &profileRepository{users: map[string]domain.User{
		"member": {ID: "member", Name: "Original", Email: "member@example.test", Status: domain.UserStatusActive, CreatedAt: time.Now()},
		"other":  {ID: "other", Username: "taken", Status: domain.UserStatusActive},
	}}
	search := &profileSearch{documents: map[string]domain.Profile{}}
	svc := NewUserService(repo, nil, nil, nil, nil, search)
	name, username, phone, location, bio := " Alex Rivera ", " Alex_123 ", "+44 7700 900123", " London ", "Hello"
	updated, err := svc.UpdateProfile(context.Background(), "member", domain.ProfileUpdate{
		Name: &name, Username: &username, Phone: &phone, Location: &location, Bio: &bio,
	})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Name != "Alex Rivera" || updated.Username != "alex_123" || updated.Phone != phone ||
		updated.Location != "London" || updated.Email != "member@example.test" ||
		!updated.CreatedAt.Equal(repo.users["member"].CreatedAt) {
		t.Fatalf("unexpected saved profile: %+v", updated)
	}
	if search.documents["member"].Name != "Alex Rivera" || search.documents["member"].Bio != "Hello" {
		t.Fatal("public name and bio changes must be indexed")
	}
	bio = "Bio only"
	if _, err := svc.UpdateProfile(context.Background(), "member", domain.ProfileUpdate{Bio: &bio}); err != nil {
		t.Fatal(err)
	}
	if repo.users["member"].Phone != phone || repo.users["member"].Username != "alex_123" {
		t.Fatal("partial update erased existing fields")
	}
	username = "TAKEN"
	if _, err := svc.UpdateProfile(context.Background(), "member", domain.ProfileUpdate{Username: &username}); !errors.Is(err, domain.ErrUsernameExists) {
		t.Fatalf("expected username conflict, got %v", err)
	}
	for _, invalid := range []domain.ProfileUpdate{
		{Name: strPointer("")},
		{Username: strPointer("ab")},
		{Username: strPointer("has spaces")},
		{Phone: strPointer("not a number")},
		{Location: strPointer(strings.Repeat("a", 101))},
		{Bio: strPointer(strings.Repeat("a", 501))},
	} {
		if _, err := svc.UpdateProfile(context.Background(), "member", invalid); err == nil {
			t.Fatalf("invalid profile accepted: %+v", invalid)
		}
	}
}

func strPointer(value string) *string { return &value }

func TestRegistrationUsername(t *testing.T) {
	repo := &profileRepository{users: map[string]domain.User{}}
	search := &profileSearch{documents: map[string]domain.Profile{}}
	svc := NewUserService(repo, profileHasher{}, profilePublisher{}, nil, nil, search)
	user, err := svc.Register(context.Background(), "alex@example.test", "password", " Alex Rivera ", " Alex_Rivera ", domain.RoleBuyer)
	if err != nil {
		t.Fatal(err)
	}
	if user.Name != "Alex Rivera" || user.Username != "alex_rivera" ||
		repo.users[user.ID].Username != "alex_rivera" || search.documents[user.ID].Username != "alex_rivera" {
		t.Fatalf("username not normalized, persisted and indexed: %+v", user)
	}
	if _, err := svc.Register(context.Background(), "another@example.test", "password", "Another", "ALEX_RIVERA", domain.RoleBuyer); !errors.Is(err, domain.ErrUsernameExists) {
		t.Fatalf("expected username conflict, got %v", err)
	}
	for _, username := range []string{"", "ab", "has spaces", strings.Repeat("a", 31)} {
		if _, err := svc.Register(context.Background(), "new@example.test", "password", "New", username, domain.RoleBuyer); !errors.Is(err, domain.ErrInvalidUsername) {
			t.Fatalf("expected invalid username for %q, got %v", username, err)
		}
	}
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
	user, err := svc.Register(ctx, "new@example.test", "password", "New Member", "new_member", domain.RoleBuyer)
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
