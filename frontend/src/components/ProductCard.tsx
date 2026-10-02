import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { ROUTES } from '../constants/routes';
import FavoriteButton from './FavoriteButton';
import { CONDITION_LABELS, CONDITION_COLORS } from '../constants/product';

export default function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0]?.image_url ?? product.image_url;

  return (
    <Link
      to={ROUTES.product(product.id)}
      className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-gray-300 text-5xl">🛍️</span>
        )}
        {/* Heart overlay */}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full w-9 h-9 flex items-center justify-center shadow">
          <FavoriteButton productId={product.id} />
        </div>
        {/* Condition badge */}
        {product.condition && (
          <span
            className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              CONDITION_COLORS[product.condition] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {CONDITION_LABELS[product.condition] ?? product.condition}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">
          {product.name}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {product.brand && <span>{product.brand}</span>}
          {product.size && <span> · {product.size}</span>}
        </p>
        <p className="mt-1.5 text-base font-bold text-gray-900">
          €{product.price}
        </p>
      </div>
    </Link>
  );
}
