import type { Product } from '../types';
import { Link } from 'react-router-dom';

const conditionLabels: Record<string, string> = {
  new_with_tags: 'New with tags',
  new_without_tags: 'New without tags',
  very_good: 'Very good',
  good: 'Good',
  satisfactory: 'Satisfactory',
};

export default function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0]?.image_url;

  return (
    <Link
      to={`/products/${product.id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer">
        {/* Image */}
        <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy" /* scalability: lazy-load images */
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-300 text-5xl">🛍️</span>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-sm font-medium text-gray-900 truncate">
            {product.name}
          </p>
          <p className="text-xs text-gray-500">
            {product.brand && <span>{product.brand} · </span>}
            {product.size && <span>{product.size} · </span>}
            {conditionLabels[product.condition] ?? product.condition}
          </p>
          <p className="mt-1 text-base font-bold text-gray-900">
            €{product.price}
          </p>
        </div>
      </div>
    </Link>
  );
}
