// Centralized route definitions — single source of truth.
// Patterns (with :params) are for <Route path=...>.
// Builders (functions) are for <Link to=...> / navigate().

export const ROUTES = {
  home: '/',
  login: '/login',
  verify: '/verify',
  cart: '/cart',
  orders: '/orders',

  // Product detail
  productDetail: '/products/:id', // route pattern
  product: (id: string) => `/products/${id}`, // link builder
} as const;
