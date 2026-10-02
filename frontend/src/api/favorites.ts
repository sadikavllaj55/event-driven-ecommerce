import { api } from './client';
import type { Product } from '../types';

export const favoriteApi = {
  list: async (): Promise<Product[]> => {
    const res = await api.get<Product[]>('/favorites');
    return res.data;
  },

  add: async (productId: string): Promise<void> => {
    await api.post(`/favorites/${productId}`);
  },

  remove: async (productId: string): Promise<void> => {
    await api.delete(`/favorites/${productId}`);
  },
};
