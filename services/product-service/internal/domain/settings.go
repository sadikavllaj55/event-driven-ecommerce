package domain

import (
	"errors"
	"time"
)

// Setting is an admin-configurable key-value config entry
type Setting struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Known setting keys
const (
	SettingMaxImagesPerProduct = "max_images_per_product"
)

var ErrSettingNotFound = errors.New("setting not found")
