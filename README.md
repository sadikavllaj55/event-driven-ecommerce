# Event-Driven E-Commerce (Microservices Demo)

A portfolio project demonstrating microservices, event-driven
architecture, and cross-language services using RabbitMQ.

## Tech Stack

- **Go** — Order Service, Inventory Service
- **TypeScript (NestJS)** — API Gateway, Payment, Notification
- **RabbitMQ** — messaging (pub/sub, work queues, DLQ)
- **PostgreSQL** — database per service
- **Docker Compose** — local orchestration

## Services

| Service              | Language   | Responsibility             |
| -------------------- | ---------- | -------------------------- |
| API Gateway          | TypeScript | Entry point, auth, routing |
| Order Service        | Go         | Create & manage orders     |
| Inventory Service    | Go         | Stock reservation          |
| Payment Service      | TypeScript | Payment processing         |
| Notification Service | TypeScript | Emails / notifications     |

## Status

🚧 Work in progress — building incrementally.

## Getting Started

(coming soon)
