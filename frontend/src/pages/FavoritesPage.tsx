import { Link } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';
import ProductCard from '../components/ProductCard';
import { ROUTES } from '../constants/routes';
import ProductCardSkeleton from '../components/ProductCardSkeleton';

export default function FavoritesPage() {
  const { favoritesQuery } = useFavorites();
  const favorites = favoritesQuery.data ?? [];

  if (favoritesQuery.isError)
    return (
      <div role="alert">
        Failed to load favorites.{' '}
        <button onClick={() => void favoritesQuery.refetch()}>Retry</button>
      </div>
    );

  if (favoritesQuery.isLoading)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">
        Your favorites ❤️
      </h1>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500">No favorites yet.</p>
          <Link
            to={ROUTES.home}
            className="inline-block mt-4 text-teal-600 hover:underline"
          >
            Browse items →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {favorites.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
