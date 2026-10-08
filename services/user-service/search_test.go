package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"user-service/internal/domain"
)

func TestMemberSearch(t *testing.T) {
	profile := domain.Profile{ID: "member-1", Name: "Sadik", CreatedAt: time.Now().UTC()}
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		requests++
		writer.Header().Set("X-Elastic-Product", "Elasticsearch")
		writer.Header().Set("Content-Type", "application/json")
		switch {
		case request.Method == http.MethodHead && request.URL.Path == "/members":
			writer.WriteHeader(http.StatusNotFound)
		case request.Method == http.MethodPut && request.URL.Path == "/members":
			var mapping map[string]any
			if err := json.NewDecoder(request.Body).Decode(&mapping); err != nil {
				t.Error(err)
			}
			mappings := mapping["mappings"].(map[string]any)
			if mappings["dynamic"] != "strict" || len(mappings["properties"].(map[string]any)) != 5 {
				t.Errorf("unexpected public profile mapping: %v", mapping)
			}
			json.NewEncoder(writer).Encode(map[string]bool{"acknowledged": true})
		case request.Method == http.MethodPut && request.URL.Path == "/members/_doc/member-1":
			var document map[string]any
			if err := json.NewDecoder(request.Body).Decode(&document); err != nil {
				t.Error(err)
			}
			if len(document) != 5 || document["name"] != "Sadik" || request.URL.Query().Get("refresh") != "true" {
				t.Errorf("unexpected indexed public profile: %v", document)
			}
			json.NewEncoder(writer).Encode(map[string]string{"result": "created"})
		case request.Method == http.MethodPost && request.URL.Path == "/members/_search":
			var body map[string]any
			if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
				t.Error(err)
			}
			query := body["query"].(map[string]any)["bool"].(map[string]any)
			clauses := query["should"].([]any)
			prefix := clauses[0].(map[string]any)["match_phrase_prefix"].(map[string]any)
			fuzzy := clauses[1].(map[string]any)["match"].(map[string]any)["name"].(map[string]any)
			if body["size"] != float64(50) || prefix["name"] != "sa" || fuzzy["fuzziness"] != "AUTO" {
				t.Errorf("unexpected name query: %v", body)
			}
			json.NewEncoder(writer).Encode(map[string]any{"hits": map[string]any{"hits": []any{map[string]any{"_source": profile}}}})
		case request.Method == http.MethodDelete && request.URL.Path == "/members/_doc/member-1":
			writer.WriteHeader(http.StatusNotFound)
			json.NewEncoder(writer).Encode(map[string]string{"result": "not_found"})
		default:
			t.Errorf("unexpected request: %s %s", request.Method, request.URL)
			writer.WriteHeader(http.StatusBadRequest)
		}
	}))
	defer server.Close()
	search, err := NewMemberSearch(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if err := search.IndexProfile(context.Background(), profile); err != nil {
		t.Fatal(err)
	}
	profiles, err := search.SearchProfiles(context.Background(), "sa")
	if err != nil || len(profiles) != 1 || profiles[0].Name != "Sadik" {
		t.Fatalf("profiles=%v error=%v", profiles, err)
	}
	if err := search.DeleteProfile(context.Background(), profile.ID); err != nil {
		t.Fatal(err)
	}
	if requests != 5 {
		t.Fatalf("expected 5 Elasticsearch requests, got %d", requests)
	}
}
