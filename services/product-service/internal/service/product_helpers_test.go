package service

import (
	"context"
	"testing"
)

func TestNormalizeAndValidateOriginalPrice(t *testing.T) {
	tests := []struct {
		name     string
		original *float64
		wantErr  bool
	}{
		{name: "no discount"},
		{name: "higher original price", original: floatPointer(60)},
		{name: "same price", original: floatPointer(50), wantErr: true},
		{name: "lower original price", original: floatPointer(49.99), wantErr: true},
		{name: "rounds to same cent", original: floatPointer(50.004), wantErr: true},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			input := ProductInput{
				SellerID:             "seller-1",
				Name:                 "Vintage coat",
				PriceDollars:         50,
				OriginalPriceDollars: testCase.original,
				Stock:                1,
			}

			err := (&ProductService{}).normalizeAndValidate(context.Background(), &input)
			if (err != nil) != testCase.wantErr {
				t.Fatalf("normalizeAndValidate() error = %v, wantErr %v", err, testCase.wantErr)
			}
		})
	}
}

func TestProductInputToDomainPreservesOriginalPriceCents(t *testing.T) {
	product := (ProductInput{
		SellerID:             "seller-1",
		PriceDollars:         45.50,
		OriginalPriceDollars: floatPointer(60),
	}).toDomain()

	if product.PriceCents != 4550 {
		t.Fatalf("sale price cents = %d, want 4550", product.PriceCents)
	}
	if product.OriginalPriceCents == nil || *product.OriginalPriceCents != 6000 {
		t.Fatalf("original price cents = %v, want 6000", product.OriginalPriceCents)
	}
}

func floatPointer(value float64) *float64 {
	return &value
}
