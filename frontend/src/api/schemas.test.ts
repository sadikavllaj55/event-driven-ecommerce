import { describe, expect, it } from 'vitest';
import { orderSchema } from './schemas';
import { http, HttpResponse } from 'msw';
import { server } from '../test/setup';
import { productApi } from './products';
import { cartApi } from './cart';

const order = {
  id: 'order-1',
  buyer_id: 'buyer-1',
  status: 'stock_reserved',
  total_cents: 2500,
  items: [{ product_id: 'product-1', quantity: 1, price_cents: 2500 }],
  created_at: '2026-10-07T12:00:00Z',
};

describe('order contract', () => {
  it('accepts saga statuses and items without optional status', () => {
    expect(orderSchema.parse(order).status).toBe('stock_reserved');
  });
  it('rejects unknown statuses and invalid money', () => {
    expect(
      orderSchema.safeParse({ ...order, status: 'complete' }).success,
    ).toBe(false);
    expect(orderSchema.safeParse({ ...order, total_cents: -1 }).success).toBe(
      false,
    );
  });
});

it('rejects malformed product and checkout HTTP responses at the API boundary', async () => {
  server.use(
    http.get('http://localhost:8080/products/product-1', () =>
      HttpResponse.json({ id: 'product-1' }),
    ),
    http.post('http://localhost:8080/cart/checkout', () =>
      HttpResponse.json({ ...order, status: 'unknown' }),
    ),
  );
  await expect(productApi.getById('product-1')).rejects.toThrow();
  await expect(cartApi.checkout()).rejects.toThrow();
});
