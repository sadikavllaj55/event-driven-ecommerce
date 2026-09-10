import amqp from 'amqplib';
import type { Channel, ChannelModel } from 'amqplib';

const EXCHANGE_NAME = 'orders';
const QUEUE_NAME = 'notification.events';

// Routing keys we listen to
export const ROUTING_KEY_PAYMENT_SUCCEEDED = 'payment.succeeded';
export const ROUTING_KEY_PAYMENT_FAILED = 'payment.failed';
export const ROUTING_KEY_STOCK_FAILED = 'stock.failed';

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

    // Declare our own queue and bind it to the events we care about
    await this.channel.assertQueue(QUEUE_NAME, { durable: true });

    const keys = [
      ROUTING_KEY_PAYMENT_SUCCEEDED,
      ROUTING_KEY_PAYMENT_FAILED,
      ROUTING_KEY_STOCK_FAILED,
    ];

    for (const key of keys) {
      await this.channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, key);
    }

    console.log(
      `Connected to RabbitMQ. Queue "${QUEUE_NAME}" bound to ${keys.join(', ')}`,
    );
  }

  // Consume messages, passing the routing key + parsed body to the handler
  async consume(
    handler: (routingKey: string, body: any) => Promise<void>,
  ): Promise<void> {
    await this.channel.prefetch(1);

    await this.channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      try {
        const routingKey = msg.fields.routingKey;
        const body = JSON.parse(msg.content.toString());
        await handler(routingKey, body);
        this.channel.ack(msg);
      } catch (err) {
        console.error('Error processing message:', err);
        this.channel.nack(msg, false, false);
      }
    });

    console.log('Waiting for messages...');
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
