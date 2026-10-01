import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../cart/useCart';

export default function CartPage() {
  const { cartQuery, removeItem, checkout } = useCart();
  const [orderResult, setOrderResult] = useState<any>(null);

  const cart = cartQuery.data;
  const items = cart?.items ?? [];
  const totalCents = items.reduce(
    (sum, it) => sum + it.price_cents * it.quantity,
    0,
  );

  if (cartQuery.isLoading)
    return <p className="text-gray-500">Loading cart…</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Your cart 🛒</h1>

      {items.length === 0 && !orderResult && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500">Your cart is empty.</p>
          <Link
            to="/"
            className="inline-block mt-4 text-teal-600 hover:underline"
          >
            Browse items →
          </Link>
        </div>
      )}

      {/* Order success */}
      {orderResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="text-3xl mb-2">🎉</div>
          <h2 className="font-bold text-green-800">Order placed!</h2>
          <p className="text-sm text-green-700 mt-1">
            Order{' '}
            <span className="font-mono">{orderResult.id?.slice(0, 8)}</span> —
            status: <span className="font-semibold">{orderResult.status}</span>{' '}
            — total: €{(orderResult.total_cents / 100).toFixed(2)}
          </p>
          <Link
            to="/"
            className="inline-block mt-3 text-teal-600 hover:underline text-sm"
          >
            Continue shopping →
          </Link>
        </div>
      )}

      {/* Cart items */}
      {items.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {items.map((it) => (
            <div
              key={it.product_id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <p className="text-sm font-mono text-gray-700">
                  {it.product_id.slice(0, 8)}…
                </p>
                <p className="text-xs text-gray-500">Qty: {it.quantity}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  €{(it.price_cents / 100).toFixed(2)}
                </span>
                <button
                  onClick={() => removeItem.mutate(it.product_id)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Total + checkout */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Total</span>
              <span className="text-xl font-bold">
                €{(totalCents / 100).toFixed(2)}
              </span>
            </div>
            <button
              onClick={() =>
                checkout.mutate(undefined, {
                  onSuccess: (data) => setOrderResult(data),
                })
              }
              disabled={checkout.isPending}
              className="w-full bg-teal-600 text-white py-3 rounded-full font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {checkout.isPending ? 'Placing order…' : 'Checkout 🎯'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
