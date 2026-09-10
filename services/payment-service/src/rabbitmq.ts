import amqp from 'amqplib';
import type { Channel, ChannelModel } from 'amqplib';

const EXCHANGE_NAME = 'orders';
const QUEUE_NAME = 'payment.stock.reserved';

// Routing keys we consume
export const ROUTING_KEY_STOCK_RESERVED = 'stock.reserved';

// Routing keys we publish
export const ROUTING_KEY_PAYMENT_SUCCEEDED = 'payment.succeeded';
export const ROUTING_KEY_PAYMENT_FAILED = 'payment.failed';

export class RabbitMQ {
  private connection!: ChannelModel;
  private channel!: Channel;

  async connect(url: string): Promise<void> {
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    // Declare the shared topic exchange (idempotent)
    await this.channel.assertExchange(EXCHANGE_NAME, 'topic', {
      durable: true,
    });

    // Declare our queue and bind it to stock.reserved
    await this.channel.assertQueue(QUEUE_NAME, { durable: true });
    await this.channel.bindQueue(
      QUEUE_NAME,
      EXCHANGE_NAME,
      ROUTING_KEY_STOCK_RESERVED,
    );

    console.log(
      `Connected to RabbitMQ. Queue "${QUEUE_NAME}" bound to "${EXCHANGE_NAME}" with key "${ROUTING_KEY_STOCK_RESERVED}"`,
    );
  }

  // Consume messages and pass the parsed body to the handler
  async consume(handler: (body: any) => Promise<void>): Promise<void> {
    // Fair dispatch: one unacked message at a time
    await this.channel.prefetch(1);

    await this.channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      try {
        const body = JSON.parse(msg.content.toString());
        await handler(body);
        this.channel.ack(msg);
      } catch (err) {
        console.error('Error processing message:', err);
        // Reject and don't requeue (we'll add DLQ later)
        this.channel.nack(msg, false, false);
      }
    });

    console.log('Waiting for messages...');
  }

  // Publish a result event
  async publish(routingKey: string, body: any): Promise<void> {
    this.channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(body)),
      { persistent: true, contentType: 'application/json' },
    );
    console.log(`Published ${routingKey} event`);
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
