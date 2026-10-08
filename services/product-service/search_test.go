package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"product-service/internal/domain"
	"product-service/internal/repository"
	"product-service/internal/service"
)

func TestCatalogueSearchFields(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("X-Elastic-Product", "Elasticsearch")
		writer.Header().Set("Content-Type", "application/json")
		if request.URL.Path == "/" {
			json.NewEncoder(writer).Encode(map[string]any{"version": map[string]string{"number": "8.13.0"}})
			return
		}
		if request.URL.Path != "/products/_search" {
			t.Errorf("unexpected request: %s %s", request.Method, request.URL)
		}
		var body struct {
			Query struct {
				Bool struct {
					Must []struct {
						Bool struct {
							Should []struct {
								MultiMatch struct {
									Fields []string `json:"fields"`
								} `json:"multi_match"`
							} `json:"should"`
						} `json:"bool"`
					} `json:"must"`
				} `json:"bool"`
			} `json:"query"`
		}
		if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
			t.Error(err)
			return
		}
		if len(body.Query.Bool.Must) != 1 || len(body.Query.Bool.Must[0].Bool.Should) != 2 {
			t.Errorf("expected fuzzy and prefix queries: %+v", body)
			return
		}
		for _, clause := range body.Query.Bool.Must[0].Bool.Should {
			want := []string{"name^2", "brand^2", "category_names", "description", "seller_name"}
			if !reflect.DeepEqual(clause.MultiMatch.Fields, want) {
				t.Errorf("search fields = %v, want %v", clause.MultiMatch.Fields, want)
			}
		}
		json.NewEncoder(writer).Encode(map[string]any{"hits": map[string]any{"hits": []any{}}})
	}))
	defer server.Close()
	search, err := NewSearch([]string{server.URL}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := search.SearchProducts(service.SearchFilters{Query: "Nike"}); err != nil {
		t.Fatal(err)
	}
}

type catalogueCategories struct {
	repository.CategoryRepository
	byID map[string]domain.Category
}

func (categories *catalogueCategories) GetCategory(ctx context.Context, id string) (*domain.Category, error) {
	category, found := categories.byID[id]
	if !found {
		return nil, domain.ErrCategoryNotFound
	}
	return &category, nil
}

func TestCatalogueIndexCategoryNames(t *testing.T) {
	rootID, parentID, leafID := "clothing", "shoes", "trainers"
	missingID, cycleID := "missing", "cycle"
	categories := &catalogueCategories{byID: map[string]domain.Category{
		rootID:   {ID: rootID, Name: "Clothing"},
		parentID: {ID: parentID, Name: "Shoes", ParentID: &rootID},
		leafID:   {ID: leafID, Name: "Trainers", ParentID: &parentID},
		cycleID:  {ID: cycleID, Name: "Cycle", ParentID: &cycleID},
	}}
	for _, testCase := range []struct {
		name       string
		categoryID *string
		want       []string
		wantError  bool
	}{
		{name: "subcategory and ancestors", categoryID: &leafID, want: []string{"Trainers", "Shoes", "Clothing"}},
		{name: "root category", categoryID: &rootID, want: []string{"Clothing"}},
		{name: "uncategorized", want: []string{}},
		{name: "missing category", categoryID: &missingID, wantError: true},
		{name: "category cycle", categoryID: &cycleID, wantError: true},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			indexed := false
			server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
				writer.Header().Set("X-Elastic-Product", "Elasticsearch")
				writer.Header().Set("Content-Type", "application/json")
				if request.URL.Path == "/" {
					json.NewEncoder(writer).Encode(map[string]any{"version": map[string]string{"number": "8.13.0"}})
					return
				}
				indexed = true
				var document struct {
					Brand         string   `json:"brand"`
					CategoryNames []string `json:"category_names"`
				}
				if err := json.NewDecoder(request.Body).Decode(&document); err != nil {
					t.Error(err)
				}
				if document.Brand != "Nike" || !reflect.DeepEqual(document.CategoryNames, testCase.want) {
					t.Errorf("indexed document = %+v, want brand Nike and categories %v", document, testCase.want)
				}
				json.NewEncoder(writer).Encode(map[string]string{"result": "created"})
			}))
			defer server.Close()
			search, err := NewSearch([]string{server.URL}, categories)
			if err != nil {
				t.Fatal(err)
			}
			err = search.IndexProduct(domain.Product{ID: "product-1", Brand: "Nike", CategoryID: testCase.categoryID})
			if (err != nil) != testCase.wantError || indexed == testCase.wantError {
				t.Fatalf("indexing error=%v, indexed=%v, wantError=%v", err, indexed, testCase.wantError)
			}
		})
	}
}
