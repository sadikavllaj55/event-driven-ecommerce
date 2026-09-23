package main

import (
	"context"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	exchangeName           = "orders" // must match the Order Service exchange
	queueName              = "inventory.events"
	routingKeyOrderCreated = "order.created" // events we want to receive
	// result routing keys we publish back
	routingKeyReserved = "stock.reserved"
	routingKeyFailed   = "stock.failed"
	// event we listen to for compensation
	routingKeyPaymentFailed = "payment.failed"
	// event to register stock for new products
	routingKeyProductCreated = "product.created"

	// dead-letter setup
	dlxName       = "orders.dlx"           // dead-letter exchange
	dlqName       = "inventory.events.dlq" // dead-letter queue
	dlqRoutingKey = "inventory.dead"       // routing key for dead letters
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

	// --- Dead-letter setup ---
	// Declare the dead-letter exchange (DLX)
	if err := ch.ExchangeDeclare(
		dlxName,  // name
		"direct", // type
		true,     // durable
		false,    // auto-deleted
		false,    // internal
		false,    // no-wait
		nil,
	); err != nil {
		return nil, err
	}

	// Declare the dead-letter queue (DLQ)
	if _, err := ch.QueueDeclare(
		dlqName, // name
		true,    // durable
		false,   // delete when unused
		false,   // exclusive
		false,   // no-wait
		nil,
	); err != nil {
		return nil, err
	}

	// Bind the DLQ to the DLX
	if err := ch.QueueBind(
		dlqName,       // queue
		dlqRoutingKey, // routing key
		dlxName,       // exchange
		false,
		nil,
	); err != nil {
		return nil, err
	}

	// Declare the MAIN queue, configured to dead-letter failed messages to the DLX
	_, err = ch.QueueDeclare(
		queueName, // name
		true,      // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		amqp.Table{
			"x-dead-letter-exchange":    dlxName,
			"x-dead-letter-routing-key": dlqRoutingKey,
		},
	)
	if err != nil {
		return nil, err
	}

	// Bind the queue to the routing keys we care about
	for _, key := range []string{routingKeyOrderCreated, routingKeyPaymentFailed, routingKeyProductCreated} {
		if err := ch.QueueBind(
			queueName,    // queue name
			key,          // routing key
			exchangeName, // exchange
			false,
			nil,
		); err != nil {
			return nil, err
		}
	}

	log.Printf("Connected to RabbitMQ. Queue %q bound to exchange %q for order.created and payment.failed",
		queueName, exchangeName)

	return &Consumer{conn: conn, channel: ch}, nil
}

// Consume starts consuming messages and calls handler for each one.
// If the handler returns an error, the message is dead-lettered (sent to DLQ).
func (c *Consumer) Consume(handler func(routingKey string, body []byte) error) error {
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
		if err := handler(msg.RoutingKey, msg.Body); err != nil {
			log.Printf("Handler error, dead-lettering message: %v", err)
			// Nack without requeue -> message goes to the DLQ
			msg.Nack(false, false)
			continue
		}
		msg.Ack(false) // acknowledge after successful processing
	}

	return nil
}

// PublishResult publishes a result event (stock.reserved or stock.failed)
func (c *Consumer) PublishResult(routingKey string, body []byte) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := c.channel.PublishWithContext(ctx,
		exchangeName, // exchange
		routingKey,   // "stock.reserved" or "stock.failed"
		false,        // mandatory
		false,        // immediate
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

	log.Printf("Published %s event", routingKey)
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
