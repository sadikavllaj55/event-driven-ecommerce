import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';

export function tokenFor(id: string, role = 'buyer') {
  return `header.${btoa(
    JSON.stringify({
      sub: id,
      email: `${id}@example.com`,
      role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  )}.signature`;
}

export function renderApp(ui: ReactElement, path = '/') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  const rendered = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...rendered, client };
}

export const product = {
  id: 'product-1',
  seller_id: 'seller-1',
  name: 'Blue jacket',
  description: '',
  price_cents: 2500,
  price: '25.00',
  stock: 1,
  gender: 'unisex',
  brand: '',
  model_code: '',
  condition: 'good',
  material: '',
  color: '',
  size: '',
  status: 'active',
  image_url: '',
  images: [],
  category_id: null,
  created_at: '2026-10-07T12:00:00Z',
};

export const order = {
  id: 'order-1',
  buyer_id: 'buyer-1',
  status: 'pending',
  total_cents: 2500,
  items: [{ product_id: product.id, quantity: 1, price_cents: 2500 }],
  created_at: '2026-10-07T12:00:00Z',
};
