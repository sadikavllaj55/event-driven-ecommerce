import { api } from './client';
import type { Order } from '../types';
import { orderSchema } from './schemas';

export const orderApi = {
  list: async (signal?: AbortSignal): Promise<Order[]> => {
    const res = await api.get<unknown>('/orders', { signal });
    return orderSchema.array().parse(res.data);
  },

  getById: async (id: string): Promise<Order> => {
    const res = await api.get<Order>(`/orders/${id}`);
    return orderSchema.parse(res.data);
  },
};
