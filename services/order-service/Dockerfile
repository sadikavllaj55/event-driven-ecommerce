# ---- Build stage ----
FROM golang:1.27-alpine AS builder

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN go build -o order-service .

# ---- Run stage ----
FROM alpine:latest

WORKDIR /app

# Copy only the compiled binary from the build stage
COPY --from=builder /app/order-service .

EXPOSE 8081

CMD ["./order-service"]
