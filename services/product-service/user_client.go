package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// UserClient fetches user info from the User Service
type UserClient struct {
	baseURL string
	http    *http.Client
}

func NewUserClient(baseURL string) *UserClient {
	return &UserClient{
		baseURL: baseURL,
		http:    &http.Client{Timeout: 5 * time.Second},
	}
}

// GetUserName fetches a user's name by ID (best-effort — returns "" on failure)
func (c *UserClient) GetUserName(userID string) string {
	resp, err := c.http.Get(fmt.Sprintf("%s/users/%s", c.baseURL, userID))
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ""
	}

	var user struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return ""
	}
	return user.Name
}
