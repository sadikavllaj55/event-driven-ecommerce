import { api } from './client';
import type { Category } from '../types';

export const categoryApi = {
  list: async (): Promise<Category[]> => {
    const res = await api.get<Category[]>('/categories');
    return res.data;
  },
};
