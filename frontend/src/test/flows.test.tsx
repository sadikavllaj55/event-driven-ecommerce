import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../hooks/useCart';
import { useFavorites } from '../hooks/useFavorites';
import ProductsPage from '../pages/ProductsPage';
import ProfilePage from '../pages/ProfilePage';
import CartPage from '../pages/CartPage';
import SellPage from '../pages/seller/SellPage';
import EditProductPage from '../pages/seller/EditProductPage';
import { Route, Routes } from 'react-router-dom';
import { server } from './setup';
import { product, renderApp, tokenFor } from './helpers';

const base = 'http://localhost:8080';
const indexedProduct = {
  id: 'product-1',
  seller_id: 'seller-1',
  seller_name: 'Seller',
  name: 'Blue jacket',
  description: 'A warm jacket',
  price_cents: 2500,
  stock: 1,
  gender: 'women',
  brand: 'Example',
  condition: 'good',
  color: 'Blue',
  material: 'Cotton',
  category_id: 'category-shoes',
  image_url: '',
};

function FavoritesProbe() {
  const { favoritesQuery } = useFavorites();
  return <span>{favoritesQuery.fetchStatus}</span>;
}

function AccountCart() {
  const { login, logout } = useAuth();
  const { cartQuery } = useCart();
  return (
    <>
      <span>{cartQuery.data?.buyer_id ?? 'No cached cart'}</span>
      <button
        onClick={() => {
          logout();
          login(tokenFor('buyer-2'));
        }}
      >
        Switch account
      </button>
    </>
  );
}

describe('frontend account and failure flows', () => {
  it('does not fetch private favorites for a guest', async () => {
    let requests = 0;
    server.use(
      http.get(`${base}/favorites`, () => {
        requests += 1;
        return HttpResponse.json([]);
      }),
    );
    renderApp(<FavoritesProbe />);
    await screen.findByText('idle');
    expect(requests).toBe(0);
  });

  it('lets guests browse public listings', async () => {
    let privateRequests = 0;
    server.use(
      http.get(`${base}/products`, () =>
        HttpResponse.json({
          products: [product],
          total: 1,
          page: 1,
          limit: 12,
        }),
      ),
      http.get(`${base}/categories`, () => HttpResponse.json([])),
      http.get(`${base}/favorites`, () => {
        privateRequests += 1;
        return HttpResponse.json([]);
      }),
    );
    renderApp(<ProductsPage />);
    await screen.findByText('Blue jacket');
    await act(async () => {
      await Promise.resolve();
    });
    expect(privateRequests).toBe(0);
  });

  it('renders Elasticsearch search hits for department and category filters', async () => {
    const searchRequests: URLSearchParams[] = [];
    server.use(
      http.get(`${base}/products`, () =>
        HttpResponse.json({ products: [], total: 0, page: 1, limit: 12 }),
      ),
      http.get(`${base}/categories`, () =>
        HttpResponse.json([
          {
            id: 'category-shoes',
            name: 'Shoes',
            slug: 'shoes',
            parent_id: null,
          },
        ]),
      ),
      http.get(`${base}/products/search`, ({ request }) => {
        searchRequests.push(new URL(request.url).searchParams);
        return HttpResponse.json([indexedProduct]);
      }),
    );

    renderApp(<ProductsPage />);
    await userEvent.click(screen.getByRole('button', { name: /women/i }));
    await screen.findByText('Blue jacket');
    expect(searchRequests.at(-1)?.get('gender')).toBe('women');

    await userEvent.click(screen.getByRole('button', { name: 'Shoes' }));
    await waitFor(() =>
      expect(searchRequests.at(-1)?.get('category')).toBe('category-shoes'),
    );
    expect(searchRequests.at(-1)?.get('gender')).toBe('women');
    expect(
      screen.queryByText('Failed to load products.'),
    ).not.toBeInTheDocument();
  });

  it('never displays the previous account cart while the next account loads', async () => {
    localStorage.setItem('token', tokenFor('buyer-1'));
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let secondRequested = false;
    server.use(
      http.get(`${base}/cart`, async ({ request }) => {
        const second = request.headers
          .get('authorization')
          ?.includes(tokenFor('buyer-2'));
        if (second) {
          secondRequested = true;
          await pending;
        }
        return HttpResponse.json({
          buyer_id: second ? 'buyer-2' : 'buyer-1',
          items: [],
        });
      }),
    );
    renderApp(<AccountCart />);
    await screen.findByText('buyer-1');
    await userEvent.click(
      screen.getByRole('button', { name: 'Switch account' }),
    );
    expect(screen.queryByText('buyer-1')).not.toBeInTheDocument();
    await waitFor(() => expect(secondRequested).toBe(true));
    release();
    await screen.findByText('buyer-2');
  });

  it('shows a profile error instead of loading forever', async () => {
    localStorage.setItem('token', tokenFor('buyer-1'));
    server.use(
      http.get(
        `${base}/users/buyer-1/profile`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    renderApp(<ProfilePage />);
    await screen.findByText(/failed to load profile/i);
    expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
  });

  it('does not describe a failed cart request as an empty cart', async () => {
    localStorage.setItem('token', tokenFor('buyer-1'));
    server.use(
      http.get(`${base}/cart`, () => new HttpResponse(null, { status: 500 })),
    );
    renderApp(<CartPage />);
    await screen.findByText(/failed to load cart/i);
    expect(screen.queryByText('Your cart is empty.')).not.toBeInTheDocument();
  });

  it('retains a created listing and retries only failed photo uploads', async () => {
    localStorage.setItem('token', tokenFor('seller-1', 'seller'));
    let creations = 0;
    let uploads = 0;
    server.use(
      http.get(`${base}/categories`, () => HttpResponse.json([])),
      http.get(`${base}/settings/public`, () =>
        HttpResponse.json({ max_images_per_product: 7 }),
      ),
      http.post(`${base}/products`, () => {
        creations += 1;
        return HttpResponse.json(product);
      }),
      http.post(`${base}/products/product-1/images`, () => {
        uploads += 1;
        return uploads === 2
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json({});
      }),
    );
    const { container } = renderApp(<SellPage />);
    await userEvent.type(
      screen.getByPlaceholderText('e.g. Blue Zara Hoodie'),
      'Blue jacket',
    );
    await userEvent.type(screen.getByPlaceholderText('25.00'), '25');
    await userEvent.upload(container.querySelector('input[type=file]')!, [
      new File(['cover'], 'cover.png', { type: 'image/png' }),
      new File(['image'], 'photo.png', { type: 'image/png' }),
    ]);
    await userEvent.click(screen.getByRole('button', { name: /list item/i }));
    await screen.findByText(/listing saved.*photo/i);
    await userEvent.click(
      screen.getByRole('button', { name: /retry.*photo/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /list item/i })).toBeEnabled(),
    );
    expect(uploads).toBe(3);
    expect(creations).toBe(1);
  });

  it('retries failed edit photos without submitting the product update again', async () => {
    localStorage.setItem('token', tokenFor('seller-1', 'seller'));
    let updates = 0;
    let uploads = 0;
    server.use(
      http.get(`${base}/products/product-1`, () => HttpResponse.json(product)),
      http.get(`${base}/categories`, () => HttpResponse.json([])),
      http.get(`${base}/settings/public`, () =>
        HttpResponse.json({ max_images_per_product: 7 }),
      ),
      http.put(`${base}/products/product-1`, () => {
        updates += 1;
        return HttpResponse.json(product);
      }),
      http.post(`${base}/products/product-1/images`, () => {
        uploads += 1;
        return uploads === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json({});
      }),
    );
    const { container } = renderApp(
      <Routes>
        <Route path="/edit/:id" element={<EditProductPage />} />
        <Route path="/my-products" element={<p>Listings</p>} />
      </Routes>,
      '/edit/product-1',
    );
    await screen.findByDisplayValue('Blue jacket');
    await userEvent.upload(
      container.querySelector('input[type=file]')!,
      new File(['image'], 'photo.png', { type: 'image/png' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText(/changes saved.*photo/i);
    await userEvent.click(
      screen.getByRole('button', { name: /retry.*photo/i }),
    );
    await waitFor(() => expect(uploads).toBe(2));
    expect(updates).toBe(1);
  });
});
