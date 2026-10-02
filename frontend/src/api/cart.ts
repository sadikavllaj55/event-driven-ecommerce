import { api } from './client';
import type { Cart, Order } from '../types';

export const cartApi = {
  get: async (): Promise<Cart> => {
    const res = await api.get<Cart>('/cart');
    return res.data;
  },

  addItem: async (productId: string, quantity: number): Promise<Cart> => {
    const res = await api.post<Cart>('/cart/items', {
      product_id: productId,
      quantity,
    });
    return res.data;
  },

  removeItem: async (productId: string): Promise<Cart> => {
    const res = await api.delete<Cart>(`/cart/items/${productId}`);
    return res.data;
  },

  checkout: async (): Promise<Order> => {
    const res = await api.post<Order>('/cart/checkout');
    return res.data;
  },
};
