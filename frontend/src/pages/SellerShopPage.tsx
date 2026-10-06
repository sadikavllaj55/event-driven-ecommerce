import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { profileApi } from '../api/profile';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../constants/routes';
import { PRODUCTS_PER_PAGE } from '../constants/product';
import Avatar from '../components/Avatar';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';

export default function SellerShopPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const profileQuery = useQuery({
    queryKey: ['profile', id],
    queryFn: () => profileApi.get(id!),
    enabled: !!id,
  });

  const productsQuery = useQuery({
    queryKey: ['seller-products', id, page],
    queryFn: () => profileApi.sellerProducts(id!, page, PRODUCTS_PER_PAGE),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

  if (profileQuery.isLoading)
    return <p className="text-gray-500">Loading shop…</p>;
  // Unknown or banned sellers both return 404
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <p className="text-gray-500">This shop doesn't exist.</p>
        <Link
          to={ROUTES.home}
          className="inline-block mt-4 text-teal-600 hover:underline"
        >
          Browse items →
        </Link>
      </div>
    );
  }

  const profile = profileQuery.data;
  const products = productsQuery.data?.products ?? [];
  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const isOwnShop = user?.sub === profile.id;

  return (
    <div>
      {/* Profile header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar url={profile.avatar_url} name={profile.name} size="lg" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
          <p className="text-sm text-gray-500">
            Member since {new Date(profile.created_at).toLocaleDateString()} ·{' '}
            {total} item
            {total !== 1 ? 's' : ''} for sale
          </p>
          {profile.bio && (
            <p className="mt-3 text-gray-700 whitespace-pre-line">
              {profile.bio}
            </p>
          )}
        </div>
        {isOwnShop && (
          <Link
            to={ROUTES.myProfile}
            className="self-start text-sm text-teal-600 border border-teal-600 px-4 py-2 rounded-full hover:bg-teal-50"
          >
            Edit profile
          </Link>
        )}
      </div>

      {/* Products */}
      {productsQuery.isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!productsQuery.isLoading && total === 0 && (
        <p className="text-gray-500 text-center py-8">
          No items for sale right now.
        </p>
      )}

      <div
        className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 transition-opacity ${
          productsQuery.isFetching ? 'opacity-60' : 'opacity-100'
        }`}
      >
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded bg-white shadow-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded bg-white shadow-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
