import { api } from './client';
import type { Order } from '../types';

export const orderApi = {
  list: async (): Promise<Order[]> => {
    const res = await api.get<Order[]>('/orders');
    return res.data;
  },

  getById: async (id: string): Promise<Order> => {
    const res = await api.get<Order>(`/orders/${id}`);
    return res.data;
  },
};
