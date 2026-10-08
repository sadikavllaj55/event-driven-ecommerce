import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/products';
import { queryKeys } from '../api/queryKeys';
import type { PagedProducts, ProductCardData } from '../types';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import Hero from '../components/Hero';
import CategoryNav from '../components/CategoryNav';
import DepartmentTabs from '../components/DepartmentTabs';
import { useDebounce } from '../hooks/useDebounce';
import { PRODUCTS_PER_PAGE } from '../constants/product';

type ProductResults = Omit<PagedProducts, 'products'> & {
  products: ProductCardData[];
};

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  // Filtering = any of search / category / department active
  const isFiltering =
    debouncedSearch.trim() !== '' || category !== null || department !== null;

  const { data, isLoading, isError, isFetching } = useQuery<ProductResults>({
    queryKey: [
      ...queryKeys.products,
      { page, search: debouncedSearch, category, department },
    ],
    queryFn: async () => {
      if (isFiltering) {
        const products = await productApi.search(
          debouncedSearch,
          category ?? undefined,
          department ?? undefined,
        );
        return {
          products,
          total: products.length,
          page: 1,
          limit: PRODUCTS_PER_PAGE,
        };
      }
      return productApi.list(page, PRODUCTS_PER_PAGE);
    },
  });

  const totalPages =
    data && !isFiltering ? Math.ceil(data.total / PRODUCTS_PER_PAGE) : 1;

  return (
    <div>
      <Hero department={department} />
      {/* Department tabs */}
      <DepartmentTabs
        selected={department}
        onSelect={(d) => {
          setDepartment(d);
          setPage(1);
        }}
      />

      {/* Search bar */}
      <div className="mb-4" id="browse">
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

      {/* Category filter */}
      <CategoryNav
        selected={category}
        onSelect={(c) => {
          setCategory(c);
          setPage(1);
        }}
      />

      <h1 className="text-xl font-semibold text-gray-900 mb-4">
        {debouncedSearch ? `Results for "${debouncedSearch}"` : 'Browse items'}
      </h1>

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && <p className="text-red-500">Failed to load products.</p>}
      {data && data.products.length === 0 && (
        <p className="text-gray-500">No items found.</p>
      )}

      {/* Product grid — smooth fade when filters change */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 transition-opacity duration-300 ${
          isFetching ? 'opacity-50' : 'opacity-100'
        }`}
      >
        {data?.products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {/* Pagination (only when browsing, not filtering) */}
      {data && !isFiltering && totalPages > 1 && (
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
