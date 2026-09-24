package handler

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"product-service/internal/domain"
)

// uploadImage handles multipart file upload for a product's gallery
func (h *ProductHandler) uploadImage(w http.ResponseWriter, r *http.Request) {
	sellerID := sellerFromHeader(w, r)
	if sellerID == "" {
		return
	}
	productID := r.PathValue("id")

	// Limit upload size to 5 MB
	const maxUploadSize = 5 << 20
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or invalid form (max 5MB)")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing 'image' file field")
		return
	}
	defer file.Close()

	// Only allow image files
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		writeError(w, http.StatusBadRequest, "only image files are allowed")
		return
	}

	img, err := h.svc.AddProductImage(
		r.Context(),
		productID, sellerID,
		header.Filename, contentType,
		file, header.Size,
	)
	if err != nil {
		writeImageError(w, err)
		return
	}

	log.Printf("Uploaded image %s for product %s", img.ID, productID)
	writeJSON(w, http.StatusCreated, img)
}

// listImages returns a product's image gallery (public)
func (h *ProductHandler) listImages(w http.ResponseWriter, r *http.Request) {
	images, err := h.svc.ListProductImages(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list images")
		return
	}
	writeJSON(w, http.StatusOK, images)
}

// deleteImage removes an image from a product's gallery
func (h *ProductHandler) deleteImage(w http.ResponseWriter, r *http.Request) {
	sellerID := sellerFromHeader(w, r)
	if sellerID == "" {
		return
	}
	if err := h.svc.DeleteProductImage(r.Context(), r.PathValue("imageId"), r.PathValue("id"), sellerID); err != nil {
		writeImageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "image deleted"})
}

// writeImageError maps image/domain errors to HTTP status codes
func writeImageError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrProductNotFound):
		writeError(w, http.StatusNotFound, "product or image not found, or not owned by you")
	case errors.Is(err, domain.ErrMaxImagesReached):
		writeError(w, http.StatusBadRequest, "maximum images per product reached")
	default:
		log.Printf("Image error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to process image")
	}
}
