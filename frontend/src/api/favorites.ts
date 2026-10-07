import { api } from './client';
import type { Product } from '../types';
import { productSchema } from './schemas';

export const favoriteApi = {
  list: async (signal?: AbortSignal): Promise<Product[]> => {
    const res = await api.get<Product[]>('/favorites', { signal });
    return productSchema.array().parse(res.data);
  },

  add: async (productId: string): Promise<void> => {
    await api.post(`/favorites/${productId}`);
  },

  remove: async (productId: string): Promise<void> => {
    await api.delete(`/favorites/${productId}`);
  },
};
