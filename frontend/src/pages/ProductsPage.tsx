import { useState } from 'react';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/products';
import { profileApi } from '../api/profile';
import { queryKeys } from '../api/queryKeys';
import type { PagedProducts, ProductCardData } from '../types';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import Hero from '../components/Hero';
import CategoryNav from '../components/CategoryNav';
import DepartmentTabs from '../components/DepartmentTabs';
import { useDebounce } from '../hooks/useDebounce';
import { PRODUCTS_PER_PAGE } from '../constants/product';
import { ROUTES } from '../constants/routes';
import Avatar from '../components/Avatar';

type ProductResults = Omit<PagedProducts, 'products'> & {
  products: ProductCardData[];
};

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<'Catalogue' | 'Members'>(
    'Catalogue',
  );
  const [category, setCategory] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 400);
  const searchingMembers = searchMode === 'Members';
  const memberSearch = debouncedSearch.trim();
  const membersQuery = useQuery({
    queryKey: ['members', memberSearch],
    queryFn: () => profileApi.search(memberSearch),
    enabled: searchingMembers && memberSearch !== '',
  });

  // Filtering = any of search / category / department active
  const isFiltering =
    debouncedSearch.trim() !== '' || category !== null || department !== null;

  const { data, isLoading, isError, isFetching } = useQuery<ProductResults>({
    enabled: !searchingMembers,
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
      {!searchingMembers && (
        <DepartmentTabs
          selected={department}
          onSelect={(d) => {
            setDepartment(d);
            setPage(1);
          }}
        />
      )}

      {/* Search bar */}
      <div
        className="mb-4 flex rounded-md bg-gray-100 focus-within:ring-2 focus-within:ring-teal-500"
        id="browse"
      >
        <Listbox
          value={searchMode}
          onChange={(mode) => {
            setSearchMode(mode);
            setPage(1);
          }}
        >
          <div className="relative shrink-0">
            <ListboxButton className="flex h-full min-w-28 items-center justify-between gap-3 rounded-l-md border-r border-gray-300 px-3 py-3 text-sm text-gray-700 focus:outline-none sm:min-w-36 sm:px-4 sm:text-base">
              {searchMode}
              <span
                aria-hidden="true"
                className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-gray-500"
              />
            </ListboxButton>
            <ListboxOptions className="absolute left-0 top-full z-30 mt-2 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg focus:outline-none">
              {(['Catalogue', 'Members'] as const).map((mode) => (
                <ListboxOption
                  key={mode}
                  value={mode}
                  className="cursor-pointer px-4 py-3 text-gray-700 data-focus:bg-gray-100 data-selected:font-semibold data-selected:text-teal-700"
                >
                  {mode}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </Listbox>
        <input
          type="search"
          aria-label={
            searchingMembers ? 'Search for members' : 'Search for items'
          }
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={
            searchingMembers ? 'Search for members' : 'Search for items'
          }
          className="min-w-0 flex-1 rounded-r-md bg-transparent px-3 py-3 text-gray-900 focus:outline-none sm:px-4"
        />
      </div>

      {/* Category filter */}
      {!searchingMembers && (
        <CategoryNav
          selected={category}
          onSelect={(c) => {
            setCategory(c);
            setPage(1);
          }}
        />
      )}

      <h1 className="text-xl font-semibold text-gray-900 mb-4">
        {debouncedSearch
          ? `Results for "${debouncedSearch}"`
          : searchingMembers
            ? 'Members'
            : 'Browse items'}
      </h1>

      {searchingMembers && (
        <div aria-live="polite">
          {memberSearch && membersQuery.isLoading && (
            <p role="status" className="text-gray-500">
              Loading members...
            </p>
          )}
          {membersQuery.isError && (
            <p className="text-red-500">Failed to load members.</p>
          )}
          {memberSearch && membersQuery.data?.length === 0 && (
            <p className="text-gray-500">No members found.</p>
          )}
          <div
            className={`divide-y divide-gray-200 transition-opacity ${membersQuery.isFetching ? 'opacity-50' : 'opacity-100'}`}
          >
            {memberSearch &&
              membersQuery.data?.map((member) => (
                <Link
                  key={member.id}
                  to={ROUTES.seller(member.id)}
                  className="flex items-center gap-3 px-2 py-4 hover:bg-gray-50 focus-visible:outline-teal-600"
                >
                  <Avatar url={member.avatar_url} name={member.name} />
                  <div className="min-w-0">
                    <p className="break-words font-medium text-gray-900">
                      {member.name}
                    </p>
                    {member.bio && (
                      <p className="line-clamp-2 break-words text-sm text-gray-500">
                        {member.bio}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {!searchingMembers && isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!searchingMembers && isError && (
        <p className="text-red-500">Failed to load products.</p>
      )}
      {!searchingMembers && data && data.products.length === 0 && (
        <p className="text-gray-500">No items found.</p>
      )}

      {/* Product grid — smooth fade when filters change */}
      {!searchingMembers && (
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 transition-opacity duration-300 ${
            isFetching ? 'opacity-50' : 'opacity-100'
          }`}
        >
          {data?.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* Pagination (only when browsing, not filtering) */}
      {!searchingMembers && data && !isFiltering && totalPages > 1 && (
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
