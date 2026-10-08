import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCart } from '../hooks/useCart';
import { useCartProducts } from '../hooks/useCartProducts';
import { ROUTES } from '../constants/routes';
import { getErrorMessage } from '../utils/errors';
import type { Order } from '../types';

export default function CartPage() {
  const { cartQuery, removeItem, checkout } = useCart();
  const [orderResult, setOrderResult] = useState<Order | null>(null);

  const items = cartQuery.data?.items ?? [];
  const products = useCartProducts(items);
  const totalCents = items.reduce(
    (sum, it) => sum + it.price_cents * it.quantity,
    0,
  );

  if (cartQuery.isLoading)
    return <p className="text-gray-500">Loading cart…</p>;
  if (cartQuery.isError)
    return (
      <div role="alert">
        Failed to load cart.{' '}
        <button onClick={() => void cartQuery.refetch()}>Retry</button>
      </div>
    );

  function handleCheckout() {
    checkout.mutate(undefined, {
      onSuccess: (order) => {
        setOrderResult(order);
        toast.success('Order placed! 🎉');
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Checkout failed')),
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Your cart 🛒</h1>

      {/* Order success */}
      {orderResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="font-bold text-green-800">Order placed! 🎉</h2>
          <p className="text-sm text-green-700 mt-1">
            Order #{orderResult.id.slice(0, 8)} · total €
            {(orderResult.total_cents / 100).toFixed(2)}
          </p>
          <div className="flex gap-4 mt-3 text-sm">
            <Link to={ROUTES.orders} className="text-teal-600 hover:underline">
              View orders →
            </Link>
            <Link to={ROUTES.home} className="text-teal-600 hover:underline">
              Continue shopping →
            </Link>
          </div>
        </div>
      )}

      {/* Empty cart */}
      {items.length === 0 && !orderResult && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500">Your cart is empty.</p>
          <Link
            to={ROUTES.home}
            className="inline-block mt-4 text-teal-600 hover:underline"
          >
            Browse items →
          </Link>
        </div>
      )}

      {/* Items */}
      {items.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {items.map((it) => {
            const product = products[it.product_id];
            const image = product?.images?.[0]?.image_url;

            return (
              <div
                key={it.product_id}
                className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4"
              >
                {/* Thumbnail */}
                <Link
                  to={ROUTES.product(it.product_id)}
                  className="w-14 h-14 shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center sm:w-16 sm:h-16"
                >
                  {image ? (
                    <img
                      src={image}
                      alt={product?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🛍️</span>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {product ? (
                    <Link
                      to={ROUTES.product(it.product_id)}
                      className="font-medium text-gray-900 hover:underline truncate block"
                    >
                      {product.name}
                    </Link>
                  ) : (
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {[product?.brand, product?.size]
                      .filter(Boolean)
                      .join(' · ')}
                    {product?.brand || product?.size ? ' · ' : ''}Qty{' '}
                    {it.quantity}
                  </p>
                </div>

                {/* Price + remove */}
                <div className="shrink-0 text-right">
                  <p className="whitespace-nowrap font-semibold text-gray-900">
                    €{((it.price_cents * it.quantity) / 100).toFixed(2)}
                  </p>
                  <button
                    onClick={() => removeItem.mutate(it.product_id)}
                    className="text-red-500 text-xs hover:underline mt-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          {/* Total + checkout */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Total</span>
              <span className="text-xl font-bold">
                €{(totalCents / 100).toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleCheckout}
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
