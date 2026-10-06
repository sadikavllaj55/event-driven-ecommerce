package main

import (
	"context"
	"fmt"
	"io"
	"log"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

const avatarBucket = "avatars"

// Storage wraps the MinIO client for profile avatars
type Storage struct {
	client     *minio.Client
	publicHost string // host used to build browser-facing URLs (e.g. localhost:9000)
}

// NewStorage connects to MinIO and ensures the avatars bucket exists (public read)
func NewStorage(endpoint, accessKey, secretKey, publicHost string) (*Storage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false, // local dev; use HTTPS in production
	})
	if err != nil {
		return nil, err
	}

	ctx := context.Background()

	exists, err := client.BucketExists(ctx, avatarBucket)
	if err != nil {
		return nil, err
	}
	if !exists {
		if err := client.MakeBucket(ctx, avatarBucket, minio.MakeBucketOptions{}); err != nil {
			return nil, err
		}
		// Avatars are shown on public seller pages → public read
		policy := fmt.Sprintf(`{
			"Version": "2012-10-17",
			"Statement": [{
				"Effect": "Allow",
				"Principal": {"AWS": ["*"]},
				"Action": ["s3:GetObject"],
				"Resource": ["arn:aws:s3:::%s/*"]
			}]
		}`, avatarBucket)
		if err := client.SetBucketPolicy(ctx, avatarBucket, policy); err != nil {
			return nil, err
		}
		log.Printf("Created bucket %q with public read access", avatarBucket)
	}

	log.Println("Connected to MinIO (avatars)")
	return &Storage{client: client, publicHost: publicHost}, nil
}

// UploadAvatar uploads an avatar image and returns its public URL
func (s *Storage) UploadAvatar(objectName string, reader io.Reader, size int64, contentType string) (string, error) {
	_, err := s.client.PutObject(context.Background(), avatarBucket, objectName, reader, size,
		minio.PutObjectOptions{ContentType: contentType})
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("http://%s/%s/%s", s.publicHost, avatarBucket, objectName), nil
}
