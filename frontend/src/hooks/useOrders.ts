import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../api/orders';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';

export function useOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders(user?.sub),
    queryFn: ({ signal }) => orderApi.list(signal),
    enabled: !!user,
    refetchInterval: (query) => {
      if (query.state.status === 'error') return false;
      return query.state.data?.some(
        (order) =>
          order.status === 'pending' || order.status === 'stock_reserved',
      )
        ? 2000
        : false;
    },
  });
}
