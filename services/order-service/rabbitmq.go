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

	// queue + keys for consuming stock results
	resultQueueName    = "order.stock.results"
	routingKeyReserved = "stock.reserved"
	routingKeyFailed   = "stock.failed"

	// payment result keys
	routingKeyPaymentSucceeded = "payment.succeeded"
	routingKeyPaymentFailed    = "payment.failed"
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

// ConsumeResults declares a queue for stock results, binds it, and consumes messages
func (p *Publisher) ConsumeResults(handler func(routingKey string, body []byte)) error {
	// Declare a queue to hold stock result events
	_, err := p.channel.QueueDeclare(
		resultQueueName, // name
		true,            // durable
		false,           // delete when unused
		false,           // exclusive
		false,           // no-wait
		nil,             // arguments
	)
	if err != nil {
		return err
	}

	// Bind the queue to BOTH result routing keys
	for _, key := range []string{
		routingKeyReserved,
		routingKeyFailed,
		routingKeyPaymentSucceeded,
		routingKeyPaymentFailed,
	} {
		if err := p.channel.QueueBind(
			resultQueueName, // queue
			key,             // routing key
			exchangeName,    // exchange
			false,
			nil,
		); err != nil {
			return err
		}
	}

	msgs, err := p.channel.Consume(
		resultQueueName, // queue
		"",              // consumer tag
		false,           // auto-ack (false = manual)
		false,           // exclusive
		false,           // no-local
		false,           // no-wait
		nil,             // args
	)
	if err != nil {
		return err
	}

	log.Println("Listening for stock results...")

	// Process results in a background loop
	go func() {
		for msg := range msgs {
			handler(msg.RoutingKey, msg.Body)
			msg.Ack(false)
		}
	}()

	return nil
}
