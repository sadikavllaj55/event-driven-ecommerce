import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cart';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../api/queryKeys';

export function useCart() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const cartKey = queryKeys.cart(user?.sub);

  const cartQuery = useQuery({
    queryKey: cartKey,
    queryFn: ({ signal }) => cartApi.get(signal),
    enabled: !!user,
  });

  const addItem = useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => cartApi.addItem(productId, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: cartKey }),
  });

  const removeItem = useMutation({
    mutationFn: (productId: string) => cartApi.removeItem(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: cartKey }),
  });

  const checkout = useMutation({
    mutationFn: cartApi.checkout,
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: cartKey }),
      qc.invalidateQueries({ queryKey: queryKeys.orders(user?.sub) }),
    ]),
  });

  return { cartQuery, addItem, removeItem, checkout };
}
