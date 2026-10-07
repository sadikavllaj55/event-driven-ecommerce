import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import App from './App';
import { server } from './test/setup';
import { renderApp, tokenFor } from './test/helpers';

function publicHandlers() {
  server.use(
    http.get('http://localhost:8080/products', () => HttpResponse.json({ products: [], total: 0, page: 1, limit: 12 })),
    http.get('http://localhost:8080/categories', () => HttpResponse.json([])),
  );
}

it('sends guests to login before mounting protected cart content', async () => {
  renderApp(<App />, '/cart');
  await screen.findByRole('heading', { name: 'Log in' });
  expect(screen.queryByText(/your cart/i)).not.toBeInTheDocument();
});

it('denies admin routes to buyers without fetching admin data', async () => {
  publicHandlers();
  localStorage.setItem('token', tokenFor('buyer-1'));
  renderApp(<App />, '/admin');
  await screen.findByRole('heading', { name: 'Access denied' });
});

it('renders a not-found page for unknown URLs', async () => {
  renderApp(<App />, '/missing-page');
  await screen.findByRole('heading', { name: 'Page not found' });
});

it('does not authenticate an expired token', async () => {
  const payload = btoa(JSON.stringify({ sub: 'buyer-1', email: 'buyer-1@example.com', role: 'buyer', exp: 1 }));
  localStorage.setItem('token', `header.${payload}.signature`);
  renderApp(<App />, '/orders');
  await screen.findByRole('heading', { name: 'Log in' });
});