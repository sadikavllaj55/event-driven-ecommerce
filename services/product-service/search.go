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
	"product-service/internal/service"
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
	categoryID := ""
	if p.CategoryID != nil {
		categoryID = *p.CategoryID
	}
	doc := map[string]any{
		"id":          p.ID,
		"seller_id":   p.SellerID,
		"seller_name": p.SellerName,
		"name":        p.Name,
		"description": p.Description,
		"price_cents": p.PriceCents,
		"stock":       p.Stock,
		"gender":      p.Gender,
		"brand":       p.Brand,
		"condition":   p.Condition,
		"color":       p.Color,
		"material":    p.Material,
		"category_id": categoryID,
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

// SearchProducts runs a full-text search with optional filters
func (s *Search) SearchProducts(f service.SearchFilters) ([]map[string]any, error) {
	// Build the "must" clause (full-text search)
	must := []map[string]any{}
	if strings.TrimSpace(f.Query) != "" {
		must = append(must, map[string]any{
			"multi_match": map[string]any{
				"query":     f.Query,
				"fields":    []string{"name^2", "description", "seller_name"},
				"fuzziness": "AUTO",
			},
		})
	} else {
		must = append(must, map[string]any{"match_all": map[string]any{}})
	}

	// Build the "filter" clause (exact-match filters — don't affect relevance score)
	filter := []map[string]any{}
	if f.CategoryID != "" {
		filter = append(filter, termFilter("category_id", f.CategoryID))
	}
	if f.Brand != "" {
		filter = append(filter, termFilter("brand", f.Brand))
	}
	if f.Condition != "" {
		filter = append(filter, termFilter("condition", f.Condition))
	}
	if f.Gender != "" {
		filter = append(filter, termFilter("gender", f.Gender))
	}
	// Price range
	if f.MinPrice > 0 || f.MaxPrice > 0 {
		priceRange := map[string]any{}
		if f.MinPrice > 0 {
			priceRange["gte"] = f.MinPrice
		}
		if f.MaxPrice > 0 {
			priceRange["lte"] = f.MaxPrice
		}
		filter = append(filter, map[string]any{
			"range": map[string]any{"price_cents": priceRange},
		})
	}

	// Combine into a bool query
	esQuery := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"must":   must,
				"filter": filter,
			},
		},
	}

	body, err := json.Marshal(esQuery)
	if err != nil {
		return nil, err
	}

	res, err := s.client.Search(
		s.client.Search.WithContext(context.Background()),
		s.client.Search.WithIndex(indexName),
		s.client.Search.WithBody(bytes.NewReader(body)),
	)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("search error: %s", res.String())
	}

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

// termFilter builds an exact-match filter (uses .keyword for text fields)
func termFilter(field, value string) map[string]any {
	// For text fields, Elasticsearch auto-creates a .keyword sub-field for exact match
	return map[string]any{
		"term": map[string]any{field + ".keyword": value},
	}
}
