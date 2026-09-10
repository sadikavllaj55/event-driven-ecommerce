package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	exchangeName = "orders"        // topic exchange for order events
	routingKey   = "order.created" // routing key for created events
)

// Publisher wraps a RabbitMQ connection and channel
type Publisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

// NewPublisher connects to RabbitMQ and declares the exchange
func NewPublisher(url string) (*Publisher, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}

	// Declare a durable topic exchange
	err = ch.ExchangeDeclare(
		exchangeName, // name
		"topic",      // type
		true,         // durable
		false,        // auto-deleted
		false,        // internal
		false,        // no-wait
		nil,          // arguments
	)
	if err != nil {
		return nil, err
	}

	log.Println("Connected to RabbitMQ and declared exchange:", exchangeName)
	return &Publisher{conn: conn, channel: ch}, nil
}

// PublishOrderCreated publishes an order.created event
func (p *Publisher) PublishOrderCreated(order Order) error {
	body, err := json.Marshal(order)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = p.channel.PublishWithContext(ctx,
		exchangeName, // exchange
		routingKey,   // routing key
		false,        // mandatory
		false,        // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent, // survive broker restart
			Body:         body,
			Timestamp:    time.Now(),
		},
	)
	if err != nil {
		return err
	}

	log.Printf("Published %s event for order %s", routingKey, order.ID)
	return nil
}

// Close cleanly shuts down the channel and connection
func (p *Publisher) Close() {
	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		p.conn.Close()
	}
}
