package service

import (
	"encoding/json"

	"inventory-service/internal/domain"
)

func marshalResult(result domain.SagaResult) ([]byte, error) {
	return json.Marshal(result)
}
