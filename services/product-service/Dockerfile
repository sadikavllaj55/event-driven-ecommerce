# ---- Build stage ----
FROM golang:1.27-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o product-service .

# ---- Run stage ----
FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/product-service .

EXPOSE 8083

CMD ["./product-service"]
