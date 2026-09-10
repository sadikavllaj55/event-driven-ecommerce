# Event-Driven E-Commerce (Microservices Demo)

A portfolio project demonstrating **microservices**, **event-driven architecture**, the **Saga pattern** with compensating transactions, **JWT authentication**, and **dead-letter queues** — built with **Go**, **TypeScript**, and **RabbitMQ**, fully containerized with **Docker**.

---

## Overview

This system simulates an e-commerce order flow across multiple independent services that communicate **only through events** (RabbitMQ) — never by calling each other directly. It demonstrates a complete distributed transaction (Saga) spanning multiple services and two languages, including automatic rollback when a step fails, secured behind an authenticating API Gateway.

The entire system runs with a single command: `docker compose up --build`.

---

## Architecture

```mermaid
flowchart LR
    Client([Client]) -->|login → JWT| Gateway[API Gateway<br/>TypeScript]
    Gateway -->|POST /orders| Order[Order Service<br/>Go]

    Order -->|order.created| RMQ{{RabbitMQ<br/>orders exchange}}
    RMQ -->|order.created| Inventory[Inventory Service<br/>Go]
    Inventory -->|stock.reserved / stock.failed| RMQ
    RMQ -->|stock.reserved| Payment[Payment Service<br/>TypeScript]
    Payment -->|payment.succeeded / payment.failed| RMQ
    RMQ -->|results| Order
    RMQ -->|payment.failed| Inventory
    RMQ -->|outcomes| Notification[Notification Service<br/>TypeScript]

    Inventory -.->|poison messages| DLQ[(Dead-Letter Queue)]

    Order --> DB1[(PostgreSQL<br/>orders)]
    Inventory --> DB2[(PostgreSQL<br/>stock)]
```

---

## The Saga Flow

A single order triggers a multi-step distributed transaction:

```
order.created
   └─▶ Inventory reserves stock
         ├─ stock.reserved ─▶ Payment processes payment
         │                      ├─ payment.succeeded ─▶ Order status: PAID ✅
         │                      └─ payment.failed ─────▶ Order status: PAYMENT_FAILED ❌
         │                                              └─▶ Inventory RESTORES stock (compensation) 🔄
         └─ stock.failed ──────────────────────────────▶ Order status: FAILED ❌
```

**Key feature — compensating transactions:** if payment fails _after_ stock was reserved, the Inventory Service listens for `payment.failed` and automatically restores the stock, keeping the system consistent.

---

## Tech Stack

| Concern               | Technology                                                   |
| --------------------- | ------------------------------------------------------------ |
| Services (Go)         | Order Service, Inventory Service                             |
| Services (TypeScript) | API Gateway, Payment Service, Notification Service           |
| Authentication        | JWT (JSON Web Tokens)                                        |
| Messaging             | RabbitMQ (topic exchange, durable queues, dead-letter queue) |
| Database              | PostgreSQL (database-per-service pattern)                    |
| Infrastructure        | Docker & Docker Compose                                      |

---

## Services

| Service              | Language   | Port | Responsibility                                       |
| -------------------- | ---------- | ---- | ---------------------------------------------------- |
| API Gateway          | TypeScript | 8080 | Single entry point, JWT auth, request forwarding     |
| Order Service        | Go         | 8081 | Creates orders, orchestrates the saga, tracks status |
| Inventory Service    | Go         | —    | Reserves & restores stock (transaction-safe)         |
| Payment Service      | TypeScript | —    | Processes payments (simulated)                       |
| Notification Service | TypeScript | —    | Sends notifications on order outcomes                |

---

## Messaging Design

All services communicate through a single RabbitMQ **topic exchange** (`orders`).

| Event               | Published by | Consumed by                                   |
| ------------------- | ------------ | --------------------------------------------- |
| `order.created`     | Order        | Inventory                                     |
| `stock.reserved`    | Inventory    | Payment, Order                                |
| `stock.failed`      | Inventory    | Order, Notification                           |
| `payment.succeeded` | Payment      | Order, Notification                           |
| `payment.failed`    | Payment      | Order, Inventory (compensation), Notification |

Messages that fail processing (e.g. malformed payloads) are routed to a **dead-letter queue** instead of being lost or blocking the consumer.

---

## Getting Started

### Prerequisites

- Docker & Docker Compose

### Run everything with one command

```bash
docker compose up --build
```

This starts:

- **RabbitMQ** (management UI at http://localhost:15672 — guest / guest)
- **PostgreSQL** (tables auto-created and seeded on first run)
- **API Gateway** (http://localhost:8080)
- **Order Service** (http://localhost:8081)
- **Inventory Service**
- **Payment Service**
- **Notification Service**

That's it — the entire distributed system is up and ready.

---

## Usage

The API Gateway secures all order requests with JWT authentication.

### 1. Log in to get a token

```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

Response:

```json
{ "token": "eyJhbGciOiJIUzI1NiI..." }
```

### 2. Create an order (authenticated)

```bash
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{"product_id": "prod-123", "quantity": 2}'
```

Watch the logs flow across all services as the saga completes.

> Requests without a valid token receive `401 Unauthorized`.

---

## Try the Failure Paths

**Insufficient stock:**

```bash
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{"product_id": "prod-456", "quantity": 99}'
```

**Payment declined (amount > 100) — triggers stock compensation:**

```bash
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{"product_id": "prod-123", "quantity": 12}'
```

**Dead-letter queue:** publish a malformed message to the `orders` exchange (routing key `order.created`) via the RabbitMQ UI — it will be routed to `inventory.events.dlq`.

---

## Running Services Individually (development)

Each service can also be run directly (requires Go 1.27+ and Node.js 20+). Copy the `.env.example` in each service folder to `.env`, then:

```bash
cd services/order-service && go run .
cd services/inventory-service && go run .
cd services/payment-service && npm install && npm start
cd services/notification-service && npm install && npm start
cd services/api-gateway && npm install && npm start
```

---

## Key Patterns Demonstrated

- **API Gateway** — single entry point with JWT authentication at the edge
- **Event-driven architecture** — services are fully decoupled via RabbitMQ
- **Saga pattern** — multi-step distributed transaction with orchestration
- **Compensating transactions** — automatic rollback (stock restored on payment failure)
- **Fan-out / pub-sub** — multiple services independently consume the same events (Order and Notification both react to `payment.succeeded`)
- **Dead-letter queue** — poison messages are quarantined instead of lost or blocking the queue
- **Database-per-service** — each service owns its data
- **Transaction-safe operations** — stock reservation uses row locking (`SELECT ... FOR UPDATE`) to prevent race conditions
- **Reliable messaging** — durable queues, persistent messages, manual acknowledgements
- **Cross-language interoperability** — Go and TypeScript services communicating seamlessly
- **Containerization** — the full system runs with a single `docker compose up`

---

## Status

✅ Fully functional: authenticated API gateway → order saga (stock → payment) → compensation + notifications, with dead-letter handling, fully containerized.

**Planned next:**

- Automated tests
- Health checks & graceful shutdown
- Observability (metrics, tracing)
