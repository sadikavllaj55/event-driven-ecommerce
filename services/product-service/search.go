package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/elastic/go-elasticsearch/v8"

	"product-service/internal/domain"
)

const indexName = "products"

// Search wraps the Elasticsearch client
type Search struct {
	client *elasticsearch.Client
}

// NewSearch connects to Elasticsearch and ensures the index exists
func NewSearch(addresses []string) (*Search, error) {
	client, err := elasticsearch.NewClient(elasticsearch.Config{
		Addresses: addresses,
	})
	if err != nil {
		return nil, err
	}

	// Verify connection
	res, err := client.Info()
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	log.Println("Connected to Elasticsearch")
	return &Search{client: client}, nil
}

// IndexProduct adds/updates a product in the search index
func (s *Search) IndexProduct(p domain.Product) error {
	doc := map[string]any{
		"id":          p.ID,
		"seller_id":   p.SellerID,
		"name":        p.Name,
		"description": p.Description,
		"price_cents": p.PriceCents,
		"stock":       p.Stock,
	}

	body, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	res, err := s.client.Index(
		indexName,
		bytes.NewReader(body),
		s.client.Index.WithDocumentID(p.ID),
		s.client.Index.WithContext(context.Background()),
	)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		return fmt.Errorf("failed to index product: %s", res.String())
	}
	return nil
}

// SearchProducts runs a full-text, typo-tolerant search
func (s *Search) SearchProducts(query string) ([]map[string]any, error) {
	// Build the search query: fuzzy multi-field match
	var esQuery string
	if strings.TrimSpace(query) == "" {
		// Empty query -> match all
		esQuery = `{"query": {"match_all": {}}}`
	} else {
		esQuery = fmt.Sprintf(`{
			"query": {
				"multi_match": {
					"query": %q,
					"fields": ["name^2", "description"],
					"fuzziness": "AUTO"
				}
			}
		}`, query)
	}

	res, err := s.client.Search(
		s.client.Search.WithContext(context.Background()),
		s.client.Search.WithIndex(indexName),
		s.client.Search.WithBody(strings.NewReader(esQuery)),
	)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("search error: %s", res.String())
	}

	// Parse the response
	var result struct {
		Hits struct {
			Hits []struct {
				Source map[string]any `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil, err
	}

	products := make([]map[string]any, 0, len(result.Hits.Hits))
	for _, hit := range result.Hits.Hits {
		products = append(products, hit.Source)
	}
	return products, nil
}
