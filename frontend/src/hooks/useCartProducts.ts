import { useQueries } from '@tanstack/react-query';
import { productApi } from '../api/products';
import type { CartItem, Product } from '../types';

// Loads product details (name, images) for each cart item.
// Uses the same query key as ProductDetailPage, so already-viewed
// products come straight from the cache, with no extra request.
export function useCartProducts(items: CartItem[]) {
  const results = useQueries({
    queries: items.map((item) => ({
      queryKey: ['product', item.product_id],
      queryFn: () => productApi.getById(item.product_id),
      staleTime: 60_000,
    })),
  });

  // Map product_id → product (undefined while loading)
  const products: Record<string, Product | undefined> = {};
  items.forEach((item, i) => {
    products[item.product_id] = results[i]?.data;
  });

  return products;
}
