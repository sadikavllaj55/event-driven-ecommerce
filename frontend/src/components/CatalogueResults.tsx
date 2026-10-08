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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      )}
      {isError && <p className="text-red-500">Failed to load products.</p>}
      {products?.length === 0 && (
        <p className="text-gray-500">No items found.</p>
      )}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 transition-opacity duration-300 ${
          isFetching ? 'opacity-50' : 'opacity-100'
        }`}
      >
        {products?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {showPagination && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={onPrevious}
            disabled={page === 1}
            className="px-4 py-2 rounded bg-white shadow-sm disabled:opacity-40"
          >
            &larr; Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={onNext}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded bg-white shadow-sm disabled:opacity-40"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </>
  );
}
