# ---- Build stage ----
FROM golang:1.27-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o cart-service .

# ---- Run stage ----
FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/cart-service .

EXPOSE 8084

CMD ["./cart-service"]
