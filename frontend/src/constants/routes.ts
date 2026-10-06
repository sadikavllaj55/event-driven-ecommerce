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
  // Seller
  sell: '/sell',
  myProducts: '/my-products',

  // Static pages
  about: '/about',
  terms: '/terms',
  privacy: '/privacy',
  faq: '/faq',
  // Admin
  adminDashboard: '/admin',
  adminUsers: '/admin/users',
  adminCategories: '/admin/categories',
  adminSettings: '/admin/settings',
  productEdit: '/my-products/:id/edit', // pattern (string) → for <Route>
  editProduct: (id: string) => `/my-products/${id}/edit`, // builder (function) → for <Link>

  myProfile: '/profile',
  sellerShop: '/sellers/:id', // route pattern
  seller: (id: string) => `/sellers/${id}`, // link builder
} as const;
