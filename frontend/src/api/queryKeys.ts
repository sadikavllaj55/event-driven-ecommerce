import type { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  private: ['private'] as const,
  cart: (userId?: string) => ['private', userId, 'cart'] as const,
  favorites: (userId?: string) => ['private', userId, 'favorites'] as const,
  orders: (userId?: string) => ['private', userId, 'orders'] as const,
  myProducts: (userId?: string) => ['private', userId, 'my-products'] as const,
  adminStats: (userId?: string) => ['private', userId, 'admin-stats'] as const,
  adminUsers: (userId?: string) => ['private', userId, 'admin-users'] as const,
  adminSettings: (userId?: string) =>
    ['private', userId, 'admin-settings'] as const,
  products: ['products'] as const,
  product: (id?: string) => ['product', id] as const,
  allProducts: ['product'] as const,
  categories: ['categories'] as const,
  publicSettings: ['public-settings'] as const,
  profile: (id?: string) => ['profile', id] as const,
  sellerProducts: (id?: string) => ['seller-products', id] as const,
};

export function invalidateListingQueries(
  client: QueryClient,
  userId?: string,
  productId?: string,
) {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.myProducts(userId) }),
    client.invalidateQueries({ queryKey: queryKeys.products }),
    client.invalidateQueries({
      queryKey: productId
        ? queryKeys.product(productId)
        : queryKeys.allProducts,
    }),
    client.invalidateQueries({ queryKey: queryKeys.sellerProducts(userId) }),
    client.invalidateQueries({ queryKey: queryKeys.favorites(userId) }),
  ]);
}
