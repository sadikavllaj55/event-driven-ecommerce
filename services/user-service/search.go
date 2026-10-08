package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/elastic/go-elasticsearch/v8"

	"user-service/internal/domain"
)

const memberIndex = "members"

type MemberSearch struct {
	client *elasticsearch.Client
}

func NewMemberSearch(address string) (*MemberSearch, error) {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.ResponseHeaderTimeout = 5 * time.Second
	client, err := elasticsearch.NewClient(elasticsearch.Config{
		Addresses: []string{address},
		Transport: transport,
	})
	if err != nil {
		return nil, err
	}
	search := &MemberSearch{client: client}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	response, err := client.Indices.Exists([]string{memberIndex}, client.Indices.Exists.WithContext(ctx))
	if err != nil {
		return nil, err
	}
	response.Body.Close()
	if response.StatusCode == http.StatusOK {
		return search, nil
	}
	if response.StatusCode != http.StatusNotFound {
		return nil, fmt.Errorf("check member index: HTTP %d", response.StatusCode)
	}
	mapping := map[string]any{
		"mappings": map[string]any{
			"dynamic": "strict",
			"properties": map[string]any{
				"id":         map[string]string{"type": "keyword"},
				"name":       map[string]string{"type": "text"},
				"avatar_url": map[string]any{"type": "keyword", "index": false},
				"bio":        map[string]any{"type": "text", "index": false},
				"created_at": map[string]string{"type": "date"},
			},
		},
	}
	body, err := json.Marshal(mapping)
	if err != nil {
		return nil, err
	}
	response, err = client.Indices.Create(memberIndex,
		client.Indices.Create.WithContext(ctx),
		client.Indices.Create.WithBody(bytes.NewReader(body)),
	)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.IsError() {
		return nil, fmt.Errorf("create member index: %s", response.String())
	}
	return search, nil
}

func (search *MemberSearch) IndexProfile(ctx context.Context, profile domain.Profile) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	body, err := json.Marshal(profile)
	if err != nil {
		return err
	}
	response, err := search.client.Index(memberIndex, bytes.NewReader(body),
		search.client.Index.WithContext(ctx),
		search.client.Index.WithDocumentID(profile.ID),
		search.client.Index.WithRefresh("true"),
	)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.IsError() {
		return fmt.Errorf("index member: %s", response.String())
	}
	return nil
}

func (search *MemberSearch) DeleteProfile(ctx context.Context, userID string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	response, err := search.client.Delete(memberIndex, userID,
		search.client.Delete.WithContext(ctx),
		search.client.Delete.WithRefresh("true"),
	)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.IsError() && response.StatusCode != http.StatusNotFound {
		return fmt.Errorf("delete member: %s", response.String())
	}
	return nil
}

func (search *MemberSearch) SearchProfiles(ctx context.Context, query string) ([]domain.Profile, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	body, err := json.Marshal(map[string]any{
		"size":    50,
		"timeout": "5s",
		"query": map[string]any{
			"bool": map[string]any{
				"should": []map[string]any{
					{"match_phrase_prefix": map[string]any{"name": query}},
					{"match": map[string]any{"name": map[string]string{"query": query, "fuzziness": "AUTO"}}},
				},
				"minimum_should_match": 1,
			},
		},
	})
	if err != nil {
		return nil, err
	}
	response, err := search.client.Search(
		search.client.Search.WithContext(ctx),
		search.client.Search.WithIndex(memberIndex),
		search.client.Search.WithAllowPartialSearchResults(false),
		search.client.Search.WithBody(bytes.NewReader(body)),
	)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.IsError() {
		return nil, fmt.Errorf("search members: %s", response.String())
	}
	var result struct {
		TimedOut bool `json:"timed_out"`
		Hits     struct {
			Hits []struct {
				Source domain.Profile `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return nil, err
	}
	if result.TimedOut {
		return nil, fmt.Errorf("member search timed out")
	}
	profiles := make([]domain.Profile, 0, len(result.Hits.Hits))
	for _, hit := range result.Hits.Hits {
		profiles = append(profiles, hit.Source)
	}
	return profiles, nil
}
