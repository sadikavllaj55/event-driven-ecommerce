import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoriteApi } from '../api/favorites';

export function useFavorites() {
  const qc = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: favoriteApi.list,
  });

  const addFavorite = useMutation({
    mutationFn: (productId: string) => favoriteApi.add(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const removeFavorite = useMutation({
    mutationFn: (productId: string) => favoriteApi.remove(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  return { favoritesQuery, addFavorite, removeFavorite };
}
