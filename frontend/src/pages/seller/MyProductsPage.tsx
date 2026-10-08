import { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productApi } from '../../api/products';
import { invalidateListingQueries, queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../utils/errors';
import SellerProductRow from './SellerProductRow';

const LISTINGS_PER_PAGE = 10;

export default function MyProductsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...queryKeys.myProducts(user?.sub), page],
    queryFn: () => productApi.listMine(page, LISTINGS_PER_PAGE),
    enabled: !!user,
    placeholderData: keepPreviousData, // keep the current page visible while the next loads
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LISTINGS_PER_PAGE));

  function invalidateAll() {
    void invalidateListingQueries(qc, user?.sub);
  }

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      productApi.setStatus(id, status),
    onSuccess: () => {
      invalidateAll();
      toast.success('Updated');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Update failed')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => productApi.remove(id),
    onSuccess: () => {
      // If we deleted the last item on the last page, step back one page
      if (products.length === 1 && page > 1) setPage((p) => p - 1);
      invalidateAll();
      toast.success('Deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Delete failed')),
  });

  if (isLoading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          My listings 🏷️{' '}
          <span className="text-sm font-normal text-gray-500">({total})</span>
        </h1>
        <Link
          to={ROUTES.sell}
          className="w-fit max-w-full whitespace-nowrap bg-teal-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-teal-700"
        >
          + Sell an item
        </Link>
      </div>

      {total === 0 && (
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

      <div
        className={`space-y-3 transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}
      >
        {products.map((product) => (
          <SellerProductRow
            key={product.id}
            product={product}
            onStatusChange={(id, status) => setStatus.mutate({ id, status })}
            onDelete={(id, name) => {
              if (window.confirm(`Delete "${name}"?`)) remove.mutate(id);
            }}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded bg-white shadow-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded bg-white shadow-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
