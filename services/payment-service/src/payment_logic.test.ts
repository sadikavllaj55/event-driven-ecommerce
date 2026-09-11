import { test } from 'node:test';
import assert from 'node:assert';
import { calculateAmount, isPaymentApproved } from './payment_logic.ts';

test('calculateAmount multiplies quantity by price', () => {
  assert.strictEqual(calculateAmount(2, 10), 20);
  assert.strictEqual(calculateAmount(5, 10), 50);
  assert.strictEqual(calculateAmount(0, 10), 0);
  assert.strictEqual(calculateAmount(1, 99), 99);
});

test('isPaymentApproved approves amounts at or below the limit', () => {
  assert.strictEqual(isPaymentApproved(50, 100), true);
  assert.strictEqual(isPaymentApproved(100, 100), true); // exactly at limit
  assert.strictEqual(isPaymentApproved(0, 100), true);
});

test('isPaymentApproved declines amounts above the limit', () => {
  assert.strictEqual(isPaymentApproved(101, 100), false);
  assert.strictEqual(isPaymentApproved(200, 100), false);
});

test('end-to-end: 12 units at price 10 exceeds limit 100', () => {
  const amount = calculateAmount(12, 10); // 120
  assert.strictEqual(isPaymentApproved(amount, 100), false);
});

test('end-to-end: 3 units at price 10 is within limit 100', () => {
  const amount = calculateAmount(3, 10); // 30
  assert.strictEqual(isPaymentApproved(amount, 100), true);
});
