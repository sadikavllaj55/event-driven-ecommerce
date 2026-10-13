import { Link } from 'react-router-dom';
import type { ProductCardData } from '../types';
import { ROUTES } from '../constants/routes';
import FavoriteButton from './FavoriteButton';
import ProductPrice from './ProductPrice';
import { CONDITION_LABELS, CONDITION_COLORS } from '../constants/product';

export default function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images?.[0]?.image_url ?? product.image_url;

  return (
    <Link
      to={ROUTES.product(product.id)}
      className="group block overflow-hidden rounded-2xl border border-[var(--market-border)]/80 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[var(--market-ink)]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/20"
    >
      {/* Image */}
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-[#edf2ef]">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="text-gray-300 text-5xl">🛍️</span>
        )}
        {/* Condition badge */}
        {product.condition && (
          <span
            className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-sm ${
              CONDITION_COLORS[product.condition] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {CONDITION_LABELS[product.condition] ?? product.condition}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--market-ink)]">
              {product.name}
            </p>
            <p className="truncate text-xs text-gray-500">
              {product.brand && <span>{product.brand}</span>}
              {product.size && <span> · {product.size}</span>}
            </p>
          </div>
          <div className="w-9 h-9 shrink-0 flex items-center justify-center">
            <FavoriteButton productId={product.id} />
          </div>
        </div>
        <ProductPrice
          price={product.price}
          originalPrice={product.original_price}
          size="card"
        />
      </div>
    </Link>
  );
}
