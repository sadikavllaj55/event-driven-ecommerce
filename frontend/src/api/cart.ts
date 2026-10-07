import { api } from './client';
import type { Cart, Order } from '../types';
import { cartSchema, orderSchema } from './schemas';

export const cartApi = {
  get: async (signal?: AbortSignal): Promise<Cart> => {
    const res = await api.get<unknown>('/cart', { signal });
    return cartSchema.parse(res.data);
  },

  addItem: async (productId: string, quantity: number): Promise<Cart> => {
    const res = await api.post<Cart>('/cart/items', {
      product_id: productId,
      quantity,
    });
    return cartSchema.parse(res.data);
  },

  removeItem: async (productId: string): Promise<Cart> => {
    const res = await api.delete<Cart>(`/cart/items/${productId}`);
    return cartSchema.parse(res.data);
  },

  checkout: async (): Promise<Order> => {
    const res = await api.post<Order>('/cart/checkout');
    return orderSchema.parse(res.data);
  },
};
