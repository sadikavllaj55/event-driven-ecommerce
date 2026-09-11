package main

import (
	"flag"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	queueName = "lab.queue"
)

func main() {
	name := flag.String("name", "consumer", "consumer name")
	flag.Parse()

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

	// Fair dispatch: only 1 unacknowledged message at a time
	if err := ch.Qos(1, 0, false); err != nil {
		log.Fatalf("Failed to set QoS: %v", err)
	}

	msgs, err := ch.Consume(
		queueName, "", false, false, false, false, nil,
	)
	if err != nil {
		log.Fatalf("Failed to consume: %v", err)
	}

	log.Printf("[%s] Consumer started. Waiting for messages... (Ctrl+C to stop)", *name)

	for msg := range msgs {
		log.Printf("[%s] Processing: %s", *name, msg.Body)
		time.Sleep(2 * time.Second)
		msg.Ack(false)
		log.Printf("[%s] Done: %s", *name, msg.Body)
	}
}
