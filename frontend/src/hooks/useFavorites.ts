import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Product } from '../types';

export function useFavorites() {
  const qc = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const res = await api.get<Product[]>('/favorites');
      return res.data;
    },
  });

  const addFavorite = useMutation({
    mutationFn: async (productId: string) => {
      await api.post(`/favorites/${productId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const removeFavorite = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/favorites/${productId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  return { favoritesQuery, addFavorite, removeFavorite };
}
