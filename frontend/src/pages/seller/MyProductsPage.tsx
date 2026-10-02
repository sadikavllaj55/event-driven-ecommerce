import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productApi } from '../../api/products';
import { ROUTES } from '../../constants/routes';

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
};

export default function MyProductsPage() {
  const qc = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['my-products'],
    queryFn: productApi.listMine,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      productApi.setStatus(id, status),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] });
      qc.invalidateQueries({ queryKey: ['products'] }); // browse grid
      qc.invalidateQueries({ queryKey: ['product'] }); // detail pages
      toast.success('Updated');
    },
    onError: () => toast.error('Update failed'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => productApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product'] });
      toast.success('Deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  if (isLoading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">My listings 🏷️</h1>
        <Link
          to={ROUTES.sell}
          className="bg-teal-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-teal-700"
        >
          + Sell an item
        </Link>
      </div>

      {(!products || products.length === 0) && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500">No listings yet.</p>
          <Link
            to={ROUTES.sell}
            className="inline-block mt-4 text-teal-600 hover:underline"
          >
            List your first item →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {products?.map((p) => {
          const image = p.images?.[0]?.image_url;
          return (
            <div
              key={p.id}
              className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4"
            >
              {/* Thumbnail */}
              <Link
                to={ROUTES.product(p.id)}
                className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center"
              >
                {image ? (
                  <img
                    src={image}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">🛍️</span>
                )}
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  to={ROUTES.product(p.id)}
                  className="font-medium text-gray-900 truncate hover:underline block"
                >
                  {p.name}
                </Link>
                <p className="text-sm text-gray-500">€{p.price}</p>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${statusStyles[p.status] ?? ''}`}
                >
                  {p.status}
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 text-sm">
                {p.status === 'active' ? (
                  <button
                    onClick={() =>
                      setStatus.mutate({ id: p.id, status: 'inactive' })
                    }
                    className="text-gray-600 hover:underline"
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setStatus.mutate({ id: p.id, status: 'active' })
                    }
                    className="text-teal-600 hover:underline"
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => remove.mutate(p.id)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
