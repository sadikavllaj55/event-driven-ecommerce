import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export interface CartItem {
  product_id: string;
  quantity: number;
  price_cents: number;
}

export interface Cart {
  buyer_id: string;
  items: CartItem[];
}

export function useCart() {
  const qc = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get<Cart>('/cart');
      return res.data;
    },
  });

  const addItem = useMutation({
    mutationFn: async ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => {
      const res = await api.post('/cart/items', {
        product_id: productId,
        quantity,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeItem = useMutation({
    mutationFn: async (productId: string) => {
      const res = await api.delete(`/cart/items/${productId}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const checkout = useMutation({
    mutationFn: async () => {
      const res = await api.post('/cart/checkout');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  return { cartQuery, addItem, removeItem, checkout };
}
