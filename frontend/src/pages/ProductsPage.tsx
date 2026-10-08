import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/products';
import { profileApi } from '../api/profile';
import { queryKeys } from '../api/queryKeys';
import type { PagedProducts, ProductCardData } from '../types';
import Hero from '../components/Hero';
import CategoryNav from '../components/CategoryNav';
import DepartmentTabs from '../components/DepartmentTabs';
import { useDebounce } from '../hooks/useDebounce';
import { PRODUCTS_PER_PAGE } from '../constants/product';
import BrowseSearchBar, {
  type SearchMode,
} from '../components/BrowseSearchBar';
import MemberSearchResults from '../components/MemberSearchResults';
import CatalogueResults from '../components/CatalogueResults';

type ProductResults = Omit<PagedProducts, 'products'> & {
  products: ProductCardData[];
};

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('Catalogue');
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

      <BrowseSearchBar
        mode={searchMode}
        search={search}
        onModeChange={(mode) => {
          setSearchMode(mode);
          setPage(1);
        }}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />

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

      {searchingMembers ? (
        <MemberSearchResults
          search={memberSearch}
          members={membersQuery.data}
          isLoading={membersQuery.isLoading}
          isError={membersQuery.isError}
          isFetching={membersQuery.isFetching}
        />
      ) : (
        <CatalogueResults
          products={data?.products}
          isLoading={isLoading}
          isError={isError}
          isFetching={isFetching}
          page={page}
          totalPages={totalPages}
          showPagination={!!data && !isFiltering && totalPages > 1}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
        />
      )}
    </div>
  );
}
