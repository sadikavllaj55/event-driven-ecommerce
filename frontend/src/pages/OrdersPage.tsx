import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface OrderItem {
  product_id: string;
  quantity: number;
  price_cents: number;
  status: string;
}

interface Order {
  id: string;
  status: string;
  total_cents: number;
  items: OrderItem[];
  created_at: string;
}

const statusStyles: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  payment_failed: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const {
    data: orders,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get<Order[]>('/orders');
      return res.data;
    },
  });

  if (isLoading) return <p className="text-gray-500">Loading orders…</p>;
  if (isError) return <p className="text-red-500">Failed to load orders.</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">
        Your orders 📦
      </h1>

      {(!orders || orders.length === 0) && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500">No orders yet.</p>
          <Link
            to="/"
            className="inline-block mt-4 text-teal-600 hover:underline"
          >
            Browse items →
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {orders?.map((order) => (
          <div key={order.id} className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm text-gray-700">
                  #{order.id.slice(0, 8)}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  statusStyles[order.status] ?? 'bg-gray-100 text-gray-700'
                }`}
              >
                {order.status}
              </span>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </div>

            <div className="mt-2 text-right font-bold text-gray-900">
              €{(order.total_cents / 100).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
