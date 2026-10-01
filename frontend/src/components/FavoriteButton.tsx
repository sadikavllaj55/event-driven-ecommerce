import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../constants/routes';

export default function FavoriteButton({ productId }: { productId: string }) {
  const { favoritesQuery, addFavorite, removeFavorite } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  // Is this product favorited?
  const isFavorited =
    optimistic ?? favoritesQuery.data?.some((p) => p.id === productId) ?? false;

  function toggle(e: React.MouseEvent) {
    e.preventDefault(); // don't trigger the card's Link
    e.stopPropagation();

    if (!user) {
      navigate(ROUTES.login);
      return;
    }

    if (isFavorited) {
      setOptimistic(false);
      removeFavorite.mutate(productId, {
        onError: () => setOptimistic(null),
        onSettled: () => setOptimistic(null),
      });
    } else {
      setOptimistic(true);
      addFavorite.mutate(productId, {
        onError: () => setOptimistic(null),
        onSettled: () => setOptimistic(null),
      });
    }
  }

  return (
    <button
      onClick={toggle}
      className="text-2xl leading-none transition-transform hover:scale-110"
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorited ? '❤️' : '🤍'}
    </button>
  );
}
