package main

import (
	"context"
	"fmt"
	"io"
	"log"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

const bucketName = "product-images"

// Storage wraps the MinIO client
type Storage struct {
	client     *minio.Client
	publicHost string // host used to build public URLs (e.g. localhost:9000)
}

// NewStorage connects to MinIO and ensures the bucket exists
func NewStorage(endpoint, accessKey, secretKey, publicHost string) (*Storage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false, // local dev; use true (HTTPS) in production
	})
	if err != nil {
		return nil, err
	}

	ctx := context.Background()

	// Create the bucket if it doesn't exist (idempotent)
	exists, err := client.BucketExists(ctx, bucketName)
	if err != nil {
		return nil, err
	}
	if !exists {
		if err := client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{}); err != nil {
			return nil, err
		}
		// Allow public read access to images (product images are public)
		policy := fmt.Sprintf(`{
			"Version": "2012-10-17",
			"Statement": [{
				"Effect": "Allow",
				"Principal": {"AWS": ["*"]},
				"Action": ["s3:GetObject"],
				"Resource": ["arn:aws:s3:::%s/*"]
			}]
		}`, bucketName)
		if err := client.SetBucketPolicy(ctx, bucketName, policy); err != nil {
			return nil, err
		}
		log.Printf("Created bucket %q with public read access", bucketName)
	}

	log.Println("Connected to MinIO")
	return &Storage{client: client, publicHost: publicHost}, nil
}

// UploadImage uploads a file and returns its public URL
func (s *Storage) UploadImage(objectName string, reader io.Reader, size int64, contentType string) (string, error) {
	ctx := context.Background()

	_, err := s.client.PutObject(ctx, bucketName, objectName, reader, size,
		minio.PutObjectOptions{ContentType: contentType})
	if err != nil {
		return "", err
	}

	// Build the public URL
	url := fmt.Sprintf("http://%s/%s/%s", s.publicHost, bucketName, objectName)
	return url, nil
}
