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
      <div
        role="alert"
        className="mx-auto max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
      >
        <p className="font-medium">Failed to load favorites.</p>
        <button
          onClick={() => void favoritesQuery.refetch()}
          className="mt-3 rounded-full border border-red-200 bg-white px-4 py-2 font-medium transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/15"
        >
          Try again
        </button>
      </div>
    );

  if (favoritesQuery.isLoading)
    return (
      <div className="mx-auto max-w-6xl" role="status" aria-label="Loading favorites">
        <div className="mb-7">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--market-primary)]">
            Your collection
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--market-ink)]">
            Your favorites
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--market-primary)]">
            Your collection
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--market-ink)] sm:text-4xl">
            Your favorites
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
            The pieces you love, all in one place.
          </p>
        </div>
        {favorites.length > 0 && (
          <p className="pb-1 text-sm text-gray-500">
            {favorites.length} {favorites.length === 1 ? 'piece' : 'pieces'} saved
          </p>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--market-border)] bg-white px-5 py-14 text-center shadow-sm">
          <span
            aria-hidden="true"
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--market-primary-soft)] text-2xl text-[var(--market-primary)]"
          >
            ♡
          </span>
          <h2 className="text-lg font-semibold text-[var(--market-ink)]">
            No favorites yet.
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
            Save the pieces you love and they’ll be waiting for you here.
          </p>
          <Link
            to={ROUTES.home}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--market-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--market-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/20"
          >
            Browse items <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-5">
          {favorites.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
