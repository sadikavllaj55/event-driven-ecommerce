import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import type { Product } from '../../types';

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
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
    <div className="bg-white rounded-lg shadow-sm p-3 flex items-center gap-3 sm:gap-4 sm:p-4">
      <Link
        to={ROUTES.product(product.id)}
        className="w-14 h-14 shrink-0 bg-gray-100 rounded overflow-hidden flex items-center justify-center sm:w-16 sm:h-16"
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl">🛍️</span>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={ROUTES.product(product.id)}
          className="font-medium text-gray-900 truncate hover:underline block"
        >
          {product.name}
        </Link>
        <p className="text-sm text-gray-500">€{product.price}</p>
        <span
          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${statusStyles[product.status] ?? ''}`}
        >
          {product.status}
        </span>
      </div>

      <div className="flex shrink-0 flex-col gap-2 text-sm">
        <Link
          to={ROUTES.editProduct(product.id)}
          className="text-teal-600 hover:underline"
        >
          Edit
        </Link>
        {product.status === 'active' ? (
          <button
            onClick={() => onStatusChange(product.id, 'inactive')}
            className="text-gray-600 hover:underline"
          >
            Pause
          </button>
        ) : (
          <button
            onClick={() => onStatusChange(product.id, 'active')}
            className="text-teal-600 hover:underline"
          >
            Activate
          </button>
        )}
        <button
          onClick={() => onDelete(product.id, product.name)}
          className="text-red-500 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
