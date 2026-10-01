// Centralized route definitions — single source of truth.
// Patterns (with :params) are for <Route path=...>.
// Builders (functions) are for <Link to=...> / navigate().

export const ROUTES = {
  home: '/',
  login: '/login',
  verify: '/verify',
  cart: '/cart',
  orders: '/orders',
  favorites: '/favorites',
  productDetail: '/products/:id',
  product: (id: string) => `/products/${id}`,
} as const;
