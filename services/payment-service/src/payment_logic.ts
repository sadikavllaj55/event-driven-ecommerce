// Pure payment logic — no I/O, no messaging. Easy to test.

// Calculate the total amount for an order
export function calculateAmount(
  quantity: number,
  pricePerUnit: number,
): number {
  return quantity * pricePerUnit;
}

// Decide whether a payment succeeds.
// Rule: payments at or below the limit succeed; above the limit are declined.
export function isPaymentApproved(amount: number, limit: number): boolean {
  return amount <= limit;
}
