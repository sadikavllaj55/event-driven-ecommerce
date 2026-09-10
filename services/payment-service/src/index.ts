import {
  RabbitMQ,
  ROUTING_KEY_PAYMENT_SUCCEEDED,
  ROUTING_KEY_PAYMENT_FAILED,
} from './rabbitmq.ts';

// Shape of the stock result event we receive
interface StockResult {
  order_id: string;
  product_id: string;
  quantity: number;
  reserved: boolean;
  reason?: string;
}

// Shape of the payment result event we publish
interface PaymentResult {
  order_id: string;
  amount: number;
  success: boolean;
  reason?: string;
}

const RABBIT_URL = 'amqp://guest:guest@localhost:5672/';

// Simulated price per unit
const PRICE_PER_UNIT = 10;

async function main() {
  const rabbit = new RabbitMQ();
  await rabbit.connect(RABBIT_URL);

  await rabbit.consume(async (event: StockResult) => {
    console.log(
      `Received stock.reserved for order ${event.order_id} (product ${event.product_id}, qty ${event.quantity})`,
    );

    const amount = event.quantity * PRICE_PER_UNIT;

    // Simulate payment processing.
    // Rule: payments over 100 fail (pretend the card was declined).
    const success = amount <= 100;

    const result: PaymentResult = {
      order_id: event.order_id,
      amount,
      success,
    };

    if (success) {
      console.log(
        `Payment SUCCEEDED for order ${event.order_id} (amount ${amount})`,
      );
      await rabbit.publish(ROUTING_KEY_PAYMENT_SUCCEEDED, result);
    } else {
      result.reason = 'payment declined (amount too high)';
      console.log(
        `Payment FAILED for order ${event.order_id} (amount ${amount})`,
      );
      await rabbit.publish(ROUTING_KEY_PAYMENT_FAILED, result);
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
