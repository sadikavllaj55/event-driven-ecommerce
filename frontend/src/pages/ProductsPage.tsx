import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { PagedProducts, Product } from '../types';
import ProductCard from '../components/ProductCard';
import { useDebounce } from '../hooks/useDebounce';

const LIMIT = 12;

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const isSearching = debouncedSearch.trim() !== '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', { page, search: debouncedSearch }],
    queryFn: async () => {
      if (isSearching) {
        // Elasticsearch search returns an array of products
        const res = await api.get<Product[]>('/products/search', {
          params: { q: debouncedSearch },
        });
        return {
          products: res.data,
          total: res.data.length,
          page: 1,
          limit: res.data.length,
        } as PagedProducts;
      }
      // Normal paginated browse
      const res = await api.get<PagedProducts>('/products', {
        params: { page, limit: LIMIT },
      });
      return res.data;
    },
  });

  const totalPages = data && !isSearching ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div>
      {/* Search bar */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search items, brands, sellers…"
          className="w-full px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <h1 className="text-xl font-semibold text-gray-900 mb-4">
        {isSearching ? `Results for "${debouncedSearch}"` : 'Browse items'}
      </h1>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-500">Failed to load products.</p>}
      {data && data.products.length === 0 && (
        <p className="text-gray-500">No items found.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {data?.products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {/* Pagination (only when browsing, not searching) */}
      {data && !isSearching && totalPages > 1 && (
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
