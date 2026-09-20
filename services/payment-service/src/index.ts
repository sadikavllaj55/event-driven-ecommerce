import {
  RabbitMQ,
  ROUTING_KEY_PAYMENT_SUCCEEDED,
  ROUTING_KEY_PAYMENT_FAILED,
} from './rabbitmq.ts';
import { isPaymentApproved } from './payment_logic.ts';

// An item in the order
interface OrderItem {
  product_id: string;
  quantity: number;
  price_cents: number;
}

// The stock.reserved event we receive (now carries total + items)
interface StockReserved {
  order_id: string;
  success: boolean;
  total_cents: number;
  items: OrderItem[];
}

// The payment result event we publish
interface PaymentResult {
  order_id: string;
  amount: number;
  success: boolean;
  reason?: string;
  items?: OrderItem[];
}

const RABBIT_URL =
  process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672/';

// Payments above this amount (in cents) fail (simulated decline)
const PAYMENT_LIMIT = Number(process.env.PAYMENT_LIMIT ?? 10000); // 10000 cents = $100

async function main() {
  const rabbit = new RabbitMQ();
  await rabbit.connect(RABBIT_URL);

  await rabbit.consume(async (event: StockReserved) => {
    const amount = event.total_cents;

    console.log(
      `Received stock.reserved for order ${event.order_id} (total ${amount} cents, ${event.items?.length ?? 0} item(s))`,
    );

    const success = isPaymentApproved(amount, PAYMENT_LIMIT);

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
      result.items = event.items; // include items so Inventory can restore stock
      console.log(
        `Payment FAILED for order ${event.order_id} (amount ${amount})`,
      );
      await rabbit.publish(ROUTING_KEY_PAYMENT_FAILED, result);
    }
  });

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
