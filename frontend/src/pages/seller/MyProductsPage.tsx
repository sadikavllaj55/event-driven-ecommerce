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

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
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

  if (isLoading)
    return (
      <div className="mx-auto max-w-6xl" role="status" aria-label="Loading listings">
        <div className="mb-7">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--market-primary)]">
            Seller studio
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--market-ink)] sm:text-4xl">
            My listings
          </h1>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex animate-pulse items-center gap-4 rounded-2xl border border-[var(--market-border)] bg-white p-4"
            >
              <div className="h-16 w-16 shrink-0 rounded-xl bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/5 rounded bg-gray-200" />
                <div className="h-3 w-1/5 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--market-primary)]">
            Seller studio
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--market-ink)] sm:text-4xl">
            My listings
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
            Keep your pieces up to date and ready for their next home.
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <p className="text-sm text-gray-500">
            {total} {total === 1 ? 'piece' : 'pieces'} listed
          </p>
          <Link
            to={ROUTES.sell}
            className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--market-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--market-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/20"
          >
            <span aria-hidden="true">+</span> Sell an item
          </Link>
        </div>
      </div>

      {isError && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
        >
          <p className="font-medium">Failed to load your listings.</p>
          <button
            onClick={() => void refetch()}
            className="mt-3 rounded-full border border-red-200 bg-white px-4 py-2 font-medium transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/15"
          >
            Try again
          </button>
        </div>
      )}

      {!isError && total === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--market-border)] bg-white px-5 py-14 text-center shadow-sm">
          <span
            aria-hidden="true"
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--market-primary-soft)] text-2xl text-[var(--market-primary)]"
          >
            ♧
          </span>
          <h2 className="text-lg font-semibold text-[var(--market-ink)]">
            No listings yet.
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
            Give a well-loved piece a new home. Your first listing starts here.
          </p>
          <Link
            to={ROUTES.sell}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--market-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--market-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/20"
          >
            List your first item <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      <div
        className={`space-y-3 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
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
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="min-h-10 rounded-full border border-[var(--market-border)] bg-white px-5 py-2 text-sm font-medium text-[var(--market-ink)] shadow-sm transition hover:bg-[var(--market-primary-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm tabular-nums text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="min-h-10 rounded-full border border-[var(--market-border)] bg-white px-5 py-2 text-sm font-medium text-[var(--market-ink)] shadow-sm transition hover:bg-[var(--market-primary-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
