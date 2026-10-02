import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cart';

export function useCart() {
  const qc = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
  });

  const addItem = useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => cartApi.addItem(productId, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeItem = useMutation({
    mutationFn: (productId: string) => cartApi.removeItem(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const checkout = useMutation({
    mutationFn: cartApi.checkout,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  return { cartQuery, addItem, removeItem, checkout };
}
