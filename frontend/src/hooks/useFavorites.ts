import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoriteApi } from '../api/favorites';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../api/queryKeys';

export function useFavorites() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const favoritesKey = queryKeys.favorites(user?.sub);

  const favoritesQuery = useQuery({
    queryKey: favoritesKey,
    queryFn: ({ signal }) => favoriteApi.list(signal),
    enabled: !!user,
  });

  const addFavorite = useMutation({
    mutationFn: (productId: string) => favoriteApi.add(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: favoritesKey }),
  });

  const removeFavorite = useMutation({
    mutationFn: (productId: string) => favoriteApi.remove(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: favoritesKey }),
  });

  return { favoritesQuery, addFavorite, removeFavorite };
}
