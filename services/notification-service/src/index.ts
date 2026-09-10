import {
  RabbitMQ,
  ROUTING_KEY_PAYMENT_SUCCEEDED,
  ROUTING_KEY_PAYMENT_FAILED,
  ROUTING_KEY_STOCK_FAILED,
} from './rabbitmq.ts';

const RABBIT_URL =
  process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672/';

// Simulate sending a notification (email/SMS/push)
function sendNotification(orderId: string, message: string): void {
  console.log(`📬 [NOTIFICATION] Order ${orderId}: ${message}`);
}

async function main() {
  const rabbit = new RabbitMQ();
  await rabbit.connect(RABBIT_URL);

  await rabbit.consume(async (routingKey: string, event: any) => {
    switch (routingKey) {
      case ROUTING_KEY_PAYMENT_SUCCEEDED:
        sendNotification(
          event.order_id,
          `Your order is confirmed and paid! Amount: ${event.amount}. Thank you! ✅`,
        );
        break;

      case ROUTING_KEY_PAYMENT_FAILED:
        sendNotification(
          event.order_id,
          `Payment failed: ${event.reason ?? 'unknown reason'}. Please try again. ❌`,
        );
        break;

      case ROUTING_KEY_STOCK_FAILED:
        sendNotification(
          event.order_id,
          `Sorry, the item is out of stock. Your order could not be completed. ❌`,
        );
        break;

      default:
        console.log(`Ignoring unknown routing key: ${routingKey}`);
    }
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await rabbit.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
