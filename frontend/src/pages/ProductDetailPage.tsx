import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Product } from '../types';
import { useCart } from '../cart/useCart';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../constants/routes';
import FavoriteButton from '../components/FavoriteButton';
import toast from 'react-hot-toast';

const conditionLabels: Record<string, string> = {
  new_with_tags: 'New with tags',
  new_without_tags: 'New without tags',
  very_good: 'Very good',
  good: 'Good',
  satisfactory: 'Satisfactory',
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeImage, setActiveImage] = useState(0);

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get<Product>(`/products/${id}`);
      return res.data;
    },
  });

  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);

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

      <div className="grid md:grid-cols-2 gap-8 mt-4">
        {/* Images */}
        <div>
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
            <div className="flex gap-2 mt-3">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded overflow-hidden border-2 ${
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
        <div>
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
              value={conditionLabels[product.condition] ?? product.condition}
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
