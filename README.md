# Event-Driven E-Commerce (Microservices Demo)

A portfolio project demonstrating **microservices**, **event-driven architecture**, and the **Saga pattern** with compensating transactions — built with **Go**, **TypeScript**, and **RabbitMQ**, fully containerized with **Docker**.

---

## Overview

This system simulates an e-commerce order flow across multiple independent services that communicate **only through events** (RabbitMQ) — never by calling each other directly. It demonstrates a complete distributed transaction (Saga) that spans three services and two languages, including automatic rollback when a step fails.

The entire system runs with a single command: `docker compose up --build`.

---

## Architecture

```mermaid
flowchart LR
    Client([Client]) -->|POST /orders| Order[Order Service<br/>Go]

    Order -->|order.created| RMQ{{RabbitMQ<br/>orders exchange}}
    RMQ -->|order.created| Inventory[Inventory Service<br/>Go]
    Inventory -->|stock.reserved / stock.failed| RMQ
    RMQ -->|stock.reserved| Payment[Payment Service<br/>TypeScript]
    Payment -->|payment.succeeded / payment.failed| RMQ
    RMQ -->|results| Order
    RMQ -->|payment.failed| Inventory

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

| Concern               | Technology                                |
| --------------------- | ----------------------------------------- |
| Services (Go)         | Order Service, Inventory Service          |
| Services (TypeScript) | Payment Service                           |
| Messaging             | RabbitMQ (topic exchange, durable queues) |
| Database              | PostgreSQL (database-per-service pattern) |
| Infrastructure        | Docker & Docker Compose                   |

---

## Services

| Service           | Language   | Port | Responsibility                                       |
| ----------------- | ---------- | ---- | ---------------------------------------------------- |
| Order Service     | Go         | 8081 | Creates orders, orchestrates the saga, tracks status |
| Inventory Service | Go         | —    | Reserves & restores stock (transaction-safe)         |
| Payment Service   | TypeScript | —    | Processes payments (simulated)                       |

---

## Messaging Design

All services communicate through a single RabbitMQ **topic exchange** (`orders`).

| Event               | Published by | Consumed by                     |
| ------------------- | ------------ | ------------------------------- |
| `order.created`     | Order        | Inventory                       |
| `stock.reserved`    | Inventory    | Payment, Order                  |
| `stock.failed`      | Inventory    | Order                           |
| `payment.succeeded` | Payment      | Order                           |
| `payment.failed`    | Payment      | Order, Inventory (compensation) |

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
- **Order Service** (http://localhost:8081)
- **Inventory Service**
- **Payment Service**

That's it — the entire distributed system is up and ready.

### Place an order

```bash
# Successful order (small amount)
curl -X POST http://localhost:8081/orders \
  -H "Content-Type: application/json" \
  -d '{"product_id": "prod-123", "quantity": 3}'
```

Watch the logs flow across all services as the saga completes.

### Running services individually (optional, for development)

Each service can also be run directly (requires Go 1.27+ and Node.js 20+). Copy the `.env.example` in each service folder to `.env`, then:

```bash
cd services/order-service && go run .
cd services/inventory-service && go run .
cd services/payment-service && npm install && npm start
```

---

## Try the Failure Paths

**Insufficient stock:**

```bash
curl -X POST http://localhost:8081/orders \
  -H "Content-Type: application/json" \
  -d '{"product_id": "prod-456", "quantity": 99}'
```

**Payment declined (amount > 100) — triggers stock compensation:**

```bash
curl -X POST http://localhost:8081/orders \
  -H "Content-Type: application/json" \
  -d '{"product_id": "prod-123", "quantity": 12}'
```

---

## Key Patterns Demonstrated

- **Event-driven architecture** — services are fully decoupled via RabbitMQ
- **Saga pattern** — multi-step distributed transaction with orchestration
- **Compensating transactions** — automatic rollback (stock restored on payment failure)
- **Database-per-service** — each service owns its data
- **Transaction-safe operations** — stock reservation uses row locking (`SELECT ... FOR UPDATE`) to prevent race conditions
- **Reliable messaging** — durable queues, persistent messages, manual acknowledgements
- **Cross-language interoperability** — Go and TypeScript services communicating seamlessly
- **Containerization** — the full system runs with a single `docker compose up`

---

## Status

✅ Core saga complete (order → stock → payment) with compensation, fully containerized.

**Planned next:**

- Notification Service (TypeScript)
- API Gateway with authentication
- Dead-letter queues & retry logic
- Observability (metrics, tracing)
- Automated tests
