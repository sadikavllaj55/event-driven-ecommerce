package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	exchangeName             = "orders" // shared topic exchange
	routingKeyProductCreated = "product.created"
)

// ProductCreatedEvent is published when a seller creates a product
type ProductCreatedEvent struct {
	ProductID string `json:"product_id"`
	Stock     int    `json:"stock"`
}

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

	err = ch.ExchangeDeclare(
		exchangeName, "topic", true, false, false, false, nil,
	)
	if err != nil {
		return nil, err
	}

	log.Println("Connected to RabbitMQ and declared exchange:", exchangeName)
	return &Publisher{conn: conn, channel: ch}, nil
}

// PublishProductCreated publishes a product.created event
func (p *Publisher) PublishProductCreated(productID string, stock int) error {
	event := ProductCreatedEvent{ProductID: productID, Stock: stock}

	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = p.channel.PublishWithContext(ctx,
		exchangeName, routingKeyProductCreated, false, false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Body:         body,
			Timestamp:    time.Now(),
		},
	)
	if err != nil {
		return err
	}

	log.Printf("Published %s event for product %s (stock %d)", routingKeyProductCreated, productID, stock)
	return nil
}

// Close cleanly shuts down
func (p *Publisher) Close() {
	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		p.conn.Close()
	}
}
