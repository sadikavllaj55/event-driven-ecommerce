package main

import (
	"context"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	exchangeName = "lab.exchange"
	queueName    = "lab.queue"
	routingKey   = "lab.event"
)

func main() {
	// Connect to the same RabbitMQ your services use
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open channel: %v", err)
	}
	defer ch.Close()

	// Declare a direct exchange for the lab
	if err := ch.ExchangeDeclare(
		exchangeName, "direct", true, false, false, false, nil,
	); err != nil {
		log.Fatalf("Failed to declare exchange: %v", err)
	}

	// Declare a queue and bind it
	if _, err := ch.QueueDeclare(
		queueName, true, false, false, false, nil,
	); err != nil {
		log.Fatalf("Failed to declare queue: %v", err)
	}
	if err := ch.QueueBind(queueName, routingKey, exchangeName, false, nil); err != nil {
		log.Fatalf("Failed to bind queue: %v", err)
	}

	log.Println("Producer started. Publishing 1 message/second... (Ctrl+C to stop)")

	count := 0
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		count++
		body := fmt.Sprintf("Message #%d at %s", count, time.Now().Format("15:04:05"))

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		err := ch.PublishWithContext(ctx,
			exchangeName, routingKey, false, false,
			amqp.Publishing{
				ContentType:  "text/plain",
				DeliveryMode: amqp.Persistent,
				Body:         []byte(body),
			},
		)
		cancel()

		if err != nil {
			log.Printf("Failed to publish: %v", err)
			continue
		}

		log.Printf("Published: %s", body)
	}
}
