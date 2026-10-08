import { queryKeys } from '../api/queryKeys';
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/products';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../constants/routes';
import FavoriteButton from '../components/FavoriteButton';
import toast from 'react-hot-toast';
import { CONDITION_LABELS } from '../constants/product';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeImage, setActiveImage] = useState(0);

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => productApi.getById(id!),
  });

  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (isError || !product)
    return <p className="text-red-500">Product not found.</p>;

  const images = product.images ?? [];
  const mainImage = images[activeImage]?.image_url;

  return (
    <div>
      <Link to={ROUTES.home} className="text-sm text-teal-600 hover:underline">
        ← Back to browse
      </Link>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-8 md:grid-cols-2">
        {/* Images */}
        <div className="min-w-0">
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-300 text-7xl">🛍️</span>
            )}
          </div>
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 shrink-0 rounded overflow-hidden border-2 ${
                    i === activeImage ? 'border-teal-500' : 'border-transparent'
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <FavoriteButton productId={product.id} />
          </div>

          <p className="text-3xl font-bold text-gray-900 mt-2">
            €{product.price}
          </p>

          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Brand" value={product.brand} />
            <Row label="Size" value={product.size} />
            <Row
              label="Condition"
              value={CONDITION_LABELS[product.condition] ?? product.condition}
            />
            <Row label="Color" value={product.color} />
            <Row label="Material" value={product.material} />
            <Row label="Gender" value={product.gender} />
          </dl>

          {product.description && (
            <p className="mt-6 text-gray-700 whitespace-pre-line">
              {product.description}
            </p>
          )}

          <button
            onClick={() => {
              if (!user) {
                navigate(ROUTES.login);
                return;
              }
              addItem.mutate(
                { productId: product.id, quantity: 1 },
                {
                  onSuccess: () => toast.success('Added to cart 🛒'),
                  onError: () => toast.error('Could not add to cart'),
                },
              );
            }}
            disabled={addItem.isPending}
            className="mt-8 w-full bg-teal-600 text-white py-3 rounded-full font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {addItem.isPending ? 'Adding…' : 'Add to cart 🛒'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex">
      <dt className="w-28 text-gray-500">{label}</dt>
      <dd className="text-gray-900 capitalize">{value}</dd>
    </div>
  );
}
