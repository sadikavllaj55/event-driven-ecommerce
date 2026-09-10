package main

import (
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	exchangeName = "orders" // must match the Order Service exchange
	queueName    = "inventory.order.created"
	routingKey   = "order.created" // events we want to receive
)

// Consumer wraps a RabbitMQ connection and channel
type Consumer struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

// NewConsumer connects to RabbitMQ, declares the exchange + queue, and binds them
func NewConsumer(url string) (*Consumer, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}

	// Declare the same topic exchange (idempotent - safe if it already exists)
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

	// Declare a durable queue for this consumer
	_, err = ch.QueueDeclare(
		queueName, // name
		true,      // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		nil,       // arguments
	)
	if err != nil {
		return nil, err
	}

	// Bind the queue to the exchange with the routing key
	err = ch.QueueBind(
		queueName,    // queue name
		routingKey,   // routing key
		exchangeName, // exchange
		false,
		nil,
	)
	if err != nil {
		return nil, err
	}

	log.Printf("Connected to RabbitMQ. Queue %q bound to exchange %q with key %q",
		queueName, exchangeName, routingKey)

	return &Consumer{conn: conn, channel: ch}, nil
}

// Consume starts consuming messages and calls handler for each one
func (c *Consumer) Consume(handler func(body []byte)) error {
	// Only give this consumer one unacknowledged message at a time (fair dispatch)
	if err := c.channel.Qos(1, 0, false); err != nil {
		return err
	}

	msgs, err := c.channel.Consume(
		queueName, // queue
		"",        // consumer tag (auto-generated)
		false,     // auto-ack (false = we ack manually)
		false,     // exclusive
		false,     // no-local
		false,     // no-wait
		nil,       // args
	)
	if err != nil {
		return err
	}

	log.Println("Waiting for messages...")

	// Process messages in a loop
	for msg := range msgs {
		handler(msg.Body)
		msg.Ack(false) // acknowledge after successful processing
	}

	return nil
}

// Close cleanly shuts down the channel and connection
func (c *Consumer) Close() {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		c.conn.Close()
	}
}
