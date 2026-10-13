import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import type { Product } from '../../types';
import ProductPrice from '../../components/ProductPrice';

const statusStyles: Record<string, string> = {
  active: 'bg-[var(--market-primary-soft)] text-[var(--market-primary)]',
  inactive: 'bg-gray-100 text-gray-600',
};

interface Props {
  product: Product;
  onStatusChange: (id: string, status: 'active' | 'inactive') => void;
  onDelete: (id: string, name: string) => void;
}

export default function SellerProductRow({
  product,
  onStatusChange,
  onDelete,
}: Props) {
  const image = product.images?.[0]?.image_url;

  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-[var(--market-border)]/80 bg-white p-3 shadow-sm transition duration-200 hover:border-[var(--market-primary)]/30 hover:shadow-md hover:shadow-[var(--market-ink)]/5 sm:gap-4 sm:p-4">
      <Link
        to={ROUTES.product(product.id)}
        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#edf2ef] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/20 sm:h-20 sm:w-20"
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-2xl">🛍️</span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={ROUTES.product(product.id)}
          className="block truncate text-sm font-semibold text-[var(--market-ink)] hover:underline sm:text-base"
        >
          {product.name}
        </Link>
        <ProductPrice
          price={product.price}
          originalPrice={product.original_price}
          size="seller"
        />
        <span
          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyles[product.status] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {product.status}
        </span>
      </div>

      <div className="flex shrink-0 flex-col items-stretch gap-1 text-xs font-medium sm:flex-row sm:items-center sm:gap-2 sm:text-sm lg:flex-col lg:items-stretch">
        <Link
          to={ROUTES.editProduct(product.id)}
          className="rounded-lg px-2.5 py-1.5 text-center text-[var(--market-primary)] transition hover:bg-[var(--market-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--market-primary)]/30"
        >
          Edit
        </Link>
        {product.status === 'active' ? (
          <button
            onClick={() => onStatusChange(product.id, 'inactive')}
            className="rounded-lg px-2.5 py-1.5 text-center text-gray-600 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/30"
          >
            Pause
          </button>
        ) : (
          <button
            onClick={() => onStatusChange(product.id, 'active')}
            className="rounded-lg px-2.5 py-1.5 text-center text-[var(--market-primary)] transition hover:bg-[var(--market-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--market-primary)]/30"
          >
            Activate
          </button>
        )}
        <button
          onClick={() => onDelete(product.id, product.name)}
          className="rounded-lg px-2.5 py-1.5 text-center text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
