import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import ProductForm from '../components/ProductForm';
import { EMPTY_PRODUCT_FORM } from '../components/productFormModel';
import { CONDITIONS, GENDERS } from '../constants/product';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../hooks/useCart';
import { useFavorites } from '../hooks/useFavorites';
import ProductsPage from '../pages/ProductsPage';
import ProductDetailPage from '../pages/ProductDetailPage';
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
  original_price_cents: 3500,
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
  it('requires explicit condition and department choices for a new listing', async () => {
    server.use(
      http.get(`${base}/categories`, () => HttpResponse.json([])),
      http.get(`${base}/settings/public`, () =>
        HttpResponse.json({ max_images_per_product: 7 }),
      ),
    );
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderApp(
      <ProductForm
        initialValues={{ ...EMPTY_PRODUCT_FORM, name: 'Jacket', price: '25' }}
        submitLabel="Save"
        submittingLabel="Saving"
        onSubmit={onSubmit}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Select a condition' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Select a department' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Select a condition' }),
    );
    await userEvent.click(screen.getByRole('option', { name: 'Good' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Select a department' }),
    );
    await userEvent.click(screen.getByRole('option', { name: 'Unisex' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        condition: 'good',
        gender: 'unisex',
        category_id: null,
      }),
      [],
    );
  });

  it.each([
    {
      field: 'condition',
      label: 'Good',
      icon: CONDITIONS[3].icon,
      options: CONDITIONS,
    },
    {
      field: 'gender',
      label: 'Unisex',
      icon: GENDERS[2].icon,
      options: GENDERS,
    },
  ])(
    'shows $field emojis and submits the selected value',
    async ({ field, label, icon, options }) => {
      server.use(
        http.get(`${base}/categories`, () => HttpResponse.json([])),
        http.get(`${base}/settings/public`, () =>
          HttpResponse.json({ max_images_per_product: 7 }),
        ),
      );
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderApp(
        <ProductForm
          initialValues={{
            ...EMPTY_PRODUCT_FORM,
            name: 'Jacket',
            price: '25',
            condition: 'good',
            gender: 'unisex',
          }}
          submitLabel="Save"
          submittingLabel="Saving"
          onSubmit={onSubmit}
        />,
      );
      const selected = screen.getByRole('button', { name: label });
      expect(within(selected).getByText(icon)).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      await userEvent.click(selected);
      for (const optionData of options) {
        const option = screen.getByRole('option', {
          name: optionData.label,
        });
        expect(within(option).getByText(optionData.icon)).toHaveAttribute(
          'aria-hidden',
          'true',
        );
      }
      await userEvent.click(
        screen.getByRole('option', { name: options[0].label }),
      );
      expect(
        within(
          screen.getByRole('button', { name: options[0].label }),
        ).getByText(options[0].icon),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ [field]: options[0].value }),
        [],
      );
    },
  );

  it('rejects an invalid discount and submits a valid seller price reduction', async () => {
    server.use(
      http.get(`${base}/categories`, () => HttpResponse.json([])),
      http.get(`${base}/settings/public`, () =>
        HttpResponse.json({ max_images_per_product: 7 }),
      ),
    );
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderApp(
      <ProductForm
        initialValues={{
          ...EMPTY_PRODUCT_FORM,
          name: 'Jacket',
          price: '25',
          condition: 'good',
          gender: 'unisex',
        }}
        submitLabel="Save"
        submittingLabel="Saving"
        onSubmit={onSubmit}
      />,
    );
    const originalInput = screen.getByPlaceholderText('e.g. 49.00');
    await userEvent.type(originalInput, '25');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.clear(originalInput);
    await userEvent.type(originalInput, '35');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ price: 25, original_price: 35 }),
      [],
    );
  });

  it('clears the discount when the seller removes the original price', async () => {
    server.use(
      http.get(`${base}/categories`, () => HttpResponse.json([])),
      http.get(`${base}/settings/public`, () =>
        HttpResponse.json({ max_images_per_product: 7 }),
      ),
    );
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderApp(
      <ProductForm
        initialValues={{
          ...EMPTY_PRODUCT_FORM,
          name: 'Jacket',
          price: '25',
          original_price: '35',
          condition: 'good',
          gender: 'unisex',
        }}
        submitLabel="Save"
        submittingLabel="Saving"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.clear(screen.getByPlaceholderText('e.g. 49.00'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ price: 25, original_price: null }),
      [],
    );
  });

  it.each([2500, 2400])(
    'uses the cart snapshot price %i when displaying reductions',
    async (snapshotCents) => {
      localStorage.setItem('token', tokenFor('buyer-1'));
      server.use(
        http.get(`${base}/cart`, () =>
          HttpResponse.json({
            buyer_id: 'buyer-1',
            items: [
              {
                product_id: product.id,
                quantity: 2,
                price_cents: snapshotCents,
              },
            ],
          }),
        ),
        http.get(`${base}/products/product-1`, () =>
          HttpResponse.json({
            ...product,
            original_price_cents: 3500,
            original_price: '35.00',
          }),
        ),
      );
      renderApp(<CartPage />);
      await screen.findByText('Blue jacket');
      expect(
        screen.getAllByText(`€${((snapshotCents * 2) / 100).toFixed(2)}`),
      ).toHaveLength(2);
      if (snapshotCents === product.price_cents) {
        expect(screen.getByText('€70.00')).toHaveClass(
          'line-through',
          'text-red-600',
        );
      } else {
        expect(screen.queryByText('€70.00')).not.toBeInTheDocument();
      }
    },
  );

  it('shows the seller profile photo and name on the product page', async () => {
    server.use(
      http.get(`${base}/products/product-1`, () => HttpResponse.json(product)),
      http.get(`${base}/users/seller-1/profile`, () =>
        HttpResponse.json({
          id: 'seller-1',
          name: 'Alex Rivera',
          avatar_url: 'https://images.example.test/alex.png',
          bio: 'Vintage clothing seller',
          created_at: '2026-10-07T12:00:00Z',
        }),
      ),
    );

    renderApp(
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>,
      '/products/product-1',
    );

    expect(
      await screen.findByRole('img', { name: 'Alex Rivera' }),
    ).toHaveAttribute('src', 'https://images.example.test/alex.png');
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
  });

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

  it('switches between catalogue and public member search', async () => {
    const memberRequests: string[] = [];
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
      http.get(`${base}/users/search`, ({ request }) => {
        memberRequests.push(new URL(request.url).searchParams.get('q') ?? '');
        return HttpResponse.json([
          {
            id: 'seller-1',
            name: 'Alex Rivera',
            avatar_url: '',
            bio: 'Vintage clothing seller',
            created_at: '2026-10-07T12:00:00Z',
          },
        ]);
      }),
      http.get(`${base}/products/search`, () =>
        HttpResponse.json([indexedProduct]),
      ),
    );
    renderApp(<ProductsPage />);
    await screen.findByText('Blue jacket');
    await userEvent.click(screen.getByRole('button', { name: 'Catalogue' }));
    await userEvent.click(screen.getByRole('option', { name: 'Members' }));
    expect(screen.queryByText('Blue jacket')).not.toBeInTheDocument();
    expect(memberRequests).toHaveLength(0);
    await userEvent.type(
      screen.getByPlaceholderText('Search for members'),
      'Alex',
    );
    expect(
      await screen.findByRole('link', { name: /Alex Rivera/ }),
    ).toHaveAttribute('href', '/sellers/seller-1');
    expect(memberRequests.at(-1)).toBe('Alex');
    await userEvent.click(screen.getByRole('button', { name: 'Members' }));
    await userEvent.click(screen.getByRole('option', { name: 'Catalogue' }));
    await screen.findByText('Blue jacket');
    expect(screen.getByPlaceholderText('Search for items')).toHaveValue('Alex');
    expect(screen.queryByText('Alex Rivera')).not.toBeInTheDocument();
  });

  it('preserves catalogue pagination and resets it when searching', async () => {
    server.use(
      http.get(`${base}/products`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json({
          products: [
            { ...product, name: page === 2 ? 'Green jacket' : 'Blue jacket' },
          ],
          total: 24,
          page,
          limit: 12,
        });
      }),
      http.get(`${base}/categories`, () => HttpResponse.json([])),
      http.get(`${base}/products/search`, () =>
        HttpResponse.json([indexedProduct]),
      ),
    );
    renderApp(<ProductsPage />);
    await screen.findByText('Blue jacket');
    expect(screen.getByRole('button', { name: /Prev/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByText('Green jacket');
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /Prev/ }));
    await screen.findByText('Blue jacket');
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByText('Green jacket');
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search for items' }),
      'Blue',
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /Next/ }),
      ).not.toBeInTheDocument(),
    );
    await screen.findByText('Blue jacket');
    await userEvent.clear(
      screen.getByRole('searchbox', { name: 'Search for items' }),
    );
    await screen.findByText('Page 1 of 2');
    expect(screen.getByRole('button', { name: /Prev/ })).toBeDisabled();
  });

  it.each([
    { status: 200, message: 'No members found.' },
    { status: 500, message: 'Failed to load members.' },
  ])(
    'shows the member results state for HTTP $status',
    async ({ status, message }) => {
      server.use(
        http.get(`${base}/products`, () =>
          HttpResponse.json({ products: [], total: 0, page: 1, limit: 12 }),
        ),
        http.get(`${base}/categories`, () => HttpResponse.json([])),
        http.get(`${base}/users/search`, () =>
          HttpResponse.json([], { status }),
        ),
      );
      renderApp(<ProductsPage />);
      await userEvent.click(screen.getByRole('button', { name: 'Catalogue' }));
      await userEvent.click(screen.getByRole('option', { name: 'Members' }));
      await userEvent.type(
        screen.getByRole('searchbox', { name: 'Search for members' }),
        'Alex',
      );
      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.queryByText('No items found.')).not.toBeInTheDocument();
    },
  );

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
    expect(screen.getByText('€35.00')).toHaveClass(
      'line-through',
      'text-red-600',
    );

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
    await userEvent.click(
      screen.getByRole('button', { name: 'Select a condition' }),
    );
    await userEvent.click(screen.getByRole('option', { name: 'Good' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Select a department' }),
    );
    await userEvent.click(screen.getByRole('option', { name: 'Unisex' }));
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
