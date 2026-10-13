import type { ProductCardData } from '../types';
import { PRODUCTS_PER_PAGE } from '../constants/product';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';

interface CatalogueResultsProps {
  products?: ProductCardData[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  page: number;
  totalPages: number;
  showPagination: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export default function CatalogueResults({
  products,
  isLoading,
  isError,
  isFetching,
  page,
  totalPages,
  showPagination,
  onPrevious,
  onNext,
}: CatalogueResultsProps) {
  return (
    <>
      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      )}
      {isError && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load products. Please try again.
        </p>
      )}
      {products?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--market-border)] bg-white px-5 py-12 text-center">
          <p className="font-medium text-[var(--market-ink)]">No items found.</p>
          <p className="mt-1 text-sm text-gray-500">
            Try a different search or category.
          </p>
        </div>
      )}
      <div
        className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-5 transition-opacity duration-300 ${
          isFetching ? 'opacity-50' : 'opacity-100'
        }`}
      >
        {products?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {showPagination && (
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={onPrevious}
            disabled={page === 1}
            className="min-h-10 rounded-full border border-[var(--market-border)] bg-white px-5 py-2 text-sm font-medium text-[var(--market-ink)] shadow-sm transition hover:bg-[var(--market-primary-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            &larr; Prev
          </button>
          <span className="text-sm tabular-nums text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={onNext}
            disabled={page >= totalPages}
            className="min-h-10 rounded-full border border-[var(--market-border)] bg-white px-5 py-2 text-sm font-medium text-[var(--market-ink)] shadow-sm transition hover:bg-[var(--market-primary-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </>
  );
}
