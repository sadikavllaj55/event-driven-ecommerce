package service

import (
	"context"
	"fmt"
	"io"

	"github.com/google/uuid"

	"product-service/internal/domain"
)

// AddProductImage uploads an image for a product (ownership + max enforced).
func (s *ProductService) AddProductImage(
	ctx context.Context,
	productID, sellerID, filename, contentType string,
	reader io.Reader,
	size int64,
) (*domain.ProductImage, error) {
	if err := s.assertOwnership(ctx, productID, sellerID); err != nil {
		return nil, err
	}

	// Enforce the max images limit
	count, err := s.repo.CountImages(ctx, productID)
	if err != nil {
		return nil, err
	}
	maxImages := GetIntSetting(ctx, s.repo, domain.SettingMaxImagesPerProduct, domain.MaxImagesPerProduct)
	if count >= maxImages {
		return nil, domain.ErrMaxImagesReached
	}

	// Upload to storage (object name namespaced by product)
	objectName := fmt.Sprintf("%s/%s-%s", productID, uuid.NewString(), filename)
	url, err := s.storage.UploadImage(objectName, reader, size, contentType)
	if err != nil {
		return nil, err
	}

	return s.repo.AddImage(ctx, productID, url)
}

// ListProductImages returns a product's image gallery
func (s *ProductService) ListProductImages(ctx context.Context, productID string) ([]domain.ProductImage, error) {
	return s.repo.ListImages(ctx, productID)
}

// DeleteProductImage removes an image (ownership enforced)
func (s *ProductService) DeleteProductImage(ctx context.Context, imageID, productID, sellerID string) error {
	if err := s.assertOwnership(ctx, productID, sellerID); err != nil {
		return err
	}
	return s.repo.DeleteImage(ctx, imageID, productID)
}

// SetImageURL updates a product's primary image URL (ownership enforced by the repo)
func (s *ProductService) SetImageURL(ctx context.Context, id, sellerID, imageURL string) (*domain.Product, error) {
	product, err := s.repo.UpdateImageURL(ctx, id, sellerID, imageURL)
	if err != nil {
		return nil, err
	}
	product.SetDisplayPrice()
	return product, nil
}

// assertOwnership verifies the product belongs to the seller (hides existence otherwise)
func (s *ProductService) assertOwnership(ctx context.Context, productID, sellerID string) error {
	owner, err := s.repo.GetProductSeller(ctx, productID)
	if err != nil {
		return err // ErrProductNotFound if missing
	}
	if owner != sellerID {
		return domain.ErrProductNotFound // hide existence from non-owners
	}
	return nil
}
