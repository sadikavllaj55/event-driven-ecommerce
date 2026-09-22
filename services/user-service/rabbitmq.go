package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	exchangeName      = "orders" // reuse the same topic exchange
	routingKeyUserReg = "user.registered"
)

// UserRegisteredEvent is published when a new user registers
type UserRegisteredEvent struct {
	UserID            string `json:"user_id"`
	Email             string `json:"email"`
	Name              string `json:"name"`
	VerificationToken string `json:"verification_token"`
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

// PublishUserRegistered publishes a user.registered event
// PublishUserRegistered publishes a user.registered event
func (p *Publisher) PublishUserRegistered(userID, email, name, verificationToken string) error {
	event := UserRegisteredEvent{
		UserID:            userID,
		Email:             email,
		Name:              name,
		VerificationToken: verificationToken,
	}

	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = p.channel.PublishWithContext(ctx,
		exchangeName, routingKeyUserReg, false, false,
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

	log.Printf("Published %s event for user %s", routingKeyUserReg, event.Email)
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
