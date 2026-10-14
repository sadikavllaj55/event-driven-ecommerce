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
import Layout from '../components/layout/Layout';
import LoginPage from '../pages/LoginPage';
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
  it('preserves two-factor login with a labeled code field and submission state', async () => {
    let finish: (() => void) | undefined;
    let submitted: unknown;
    server.use(
      http.post(`${base}/login`, () => HttpResponse.json({ error: '2FA required' }, { status: 428 })),
      http.post(`${base}/login/2fa`, async ({ request }) => {
        submitted = await request.json();
        await new Promise<void>((resolve) => { finish = resolve; });
        return HttpResponse.json({ token: tokenFor('buyer-1') });
      }),
    );
    renderApp(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>Signed in successfully</p>} />
      </Routes>,
      '/login',
    );
    await userEvent.type(screen.getByLabelText('Email'), 'buyer-1@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await userEvent.type(await screen.findByLabelText('Authentication code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(screen.getByRole('button', { name: 'Verifying...' })).toBeDisabled();
    await waitFor(() => expect(finish).toBeDefined());
    expect(submitted).toEqual({ email: 'buyer-1@example.com', code: '123456' });
    finish?.();
    expect(await screen.findByText('Signed in successfully')).toBeInTheDocument();
  });

  it('registers with full name and a normalized username and preserves verification flow', async () => {
    let submitted: unknown;
    server.use(
      http.post(`${base}/register`, async ({ request }) => {
        submitted = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    renderApp(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'No account? Sign up' }));
    expect(screen.getByLabelText('Full name')).toBeRequired();
    expect(screen.getByLabelText('Username')).toBeRequired();
    await userEvent.type(screen.getByLabelText('Full name'), 'Alex Rivera');
    await userEvent.type(screen.getByLabelText('Username'), 'Alex_Rivera');
    await userEvent.type(screen.getByLabelText('Email'), 'alex@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(await screen.findByRole('status')).toHaveTextContent('verification link');
    expect(submitted).toEqual({
      name: 'Alex Rivera', username: 'alex_rivera',
      email: 'alex@example.test', password: 'password', role: 'buyer',
    });
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('keeps sign-up details when a username is already taken', async () => {
    server.use(
      http.post(`${base}/register`, () =>
        HttpResponse.json({ error: 'username already taken' }, { status: 409 }),
      ),
    );
    renderApp(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'No account? Sign up' }));
    await userEvent.type(screen.getByLabelText('Full name'), 'Alex Rivera');
    await userEvent.type(screen.getByLabelText('Username'), 'taken');
    await userEvent.type(screen.getByLabelText('Email'), 'alex@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('username already taken');
    expect(screen.getByLabelText('Username')).toHaveValue('taken');
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled();
  });

  it('shows the login link instead of the avatar menu to guests', () => {
    renderApp(<Layout />);

    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /open account menu/i }),
    ).not.toBeInTheDocument();
  });

  it('provides an accessible avatar menu with supported account actions', async () => {
    localStorage.setItem('token', tokenFor('buyer-1'));
    server.use(
      http.get(`${base}/users/buyer-1/profile`, () =>
        HttpResponse.json({
          id: 'buyer-1',
          name: 'Alex Rivera',
          avatar_url: 'https://images.example.test/alex.png',
          bio: '',
          created_at: '2026-10-07T12:00:00Z',
        }),
      ),
    );
    const user = userEvent.setup();
    renderApp(<Layout />);

    const avatarButton = await screen.findByRole('button', {
      name: 'Open account menu for Alex Rivera',
    });
    expect(screen.getByRole('img', { name: 'Alex Rivera' })).toHaveAttribute(
      'src',
      'https://images.example.test/alex.png',
    );

    await user.click(avatarButton);
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(
      screen.getByRole('menuitem', { name: /notifications/i }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByRole('menuitem', { name: /messages/i }),
    ).toHaveAttribute('aria-disabled', 'true');

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument(),
    );
    expect(avatarButton).toHaveFocus();

    await user.click(avatarButton);
    await user.click(document.body);
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument(),
    );

    await user.click(avatarButton);
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }));
    expect(localStorage.getItem('token')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Log in' }),
    ).toBeInTheDocument();
  });

  it('shows profile initials in the avatar when no profile photo is set', async () => {
    localStorage.setItem('token', tokenFor('buyer-1'));
    server.use(
      http.get(`${base}/users/buyer-1/profile`, () =>
        HttpResponse.json({
          id: 'buyer-1',
          name: 'Alex Rivera',
          avatar_url: '',
          bio: '',
          created_at: '2026-10-07T12:00:00Z',
        }),
      ),
    );
    renderApp(<Layout />);

    const avatarButton = await screen.findByRole('button', {
      name: 'Open account menu for Alex Rivera',
    });
    expect(avatarButton).toHaveTextContent('AR');
  });

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

  it.each(['alex_rivera', ''])('shows the seller username %j with a name fallback on the product page', async (username) => {
    server.use(
      http.get(`${base}/products/product-1`, () => HttpResponse.json(product)),
      http.get(`${base}/users/seller-1/profile`, () =>
        HttpResponse.json({
          id: 'seller-1',
          name: 'Alex Rivera',
          username,
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

    const sellerName = username ? `@${username}` : 'Alex Rivera';
    expect(
      await screen.findByRole('img', { name: sellerName }),
    ).toHaveAttribute('src', 'https://images.example.test/alex.png');
    expect(screen.getByText(sellerName)).toBeInTheDocument();
    if (username) {
      expect(screen.queryByText('Alex Rivera')).not.toBeInTheDocument();
    }
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
        `${base}/profile`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    renderApp(<ProfilePage />);
    await screen.findByText(/failed to load profile/i);
    expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
  });

  it('edits and persists account profile fields without changing email or membership date', async () => {
    localStorage.setItem('token', tokenFor('buyer-1'));
    const initial = {
      id: 'buyer-1', name: 'Alex Rivera', username: 'alex', phone: '',
      location: 'London', email: 'buyer-1@example.com', avatar_url: '', bio: 'Hello',
      created_at: '2026-10-07T12:00:00Z',
    };
    let saved = initial;
    let submitted: unknown;
    server.use(
      http.get(`${base}/profile`, () => HttpResponse.json(saved)),
      http.put(`${base}/profile`, async ({ request }) => {
        submitted = await request.json();
        saved = { ...initial, name: 'Alex Updated', username: 'alex_new', phone: '+44 7700 900123', location: 'Paris', bio: 'New bio' };
        return HttpResponse.json(saved);
      }),
    );
    const rendered = renderApp(<ProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit profile' }));
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument();
    await userEvent.upload(
      screen.getByLabelText('Profile photo'),
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Image must be at most 2 MB.');
    expect(screen.getByLabelText(/^Email/)).toBeDisabled();
    for (const [label, value] of [
      [/^Full name/, 'Alex Updated'], [/^Username/, 'alex_new'],
      [/^Phone number/, '+44 7700 900123'], [/^Location/, 'Paris'],
      [/^Short bio/, 'New bio'],
    ] as const) {
      await userEvent.clear(screen.getByLabelText(label));
      await userEvent.type(screen.getByLabelText(label), value);
    }
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('button', { name: 'Edit profile' });
    expect(submitted).toEqual({
      name: 'Alex Updated', username: 'alex_new', phone: '+44 7700 900123',
      location: 'Paris', bio: 'New bio',
    });
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(rendered.client.getQueryData(['profile', 'buyer-1'])).not.toHaveProperty('phone');
    rendered.unmount();
    renderApp(<ProfilePage />);
    expect(await screen.findByText('Paris')).toBeInTheDocument();
  });

  it('keeps unsaved profile edits visible when saving fails', async () => {
    localStorage.setItem('token', tokenFor('buyer-1'));
    server.use(
      http.get(`${base}/profile`, () => HttpResponse.json({
        id: 'buyer-1', name: 'Alex', username: '', phone: '', location: '',
        email: 'buyer-1@example.com', avatar_url: '', bio: '', created_at: '2026-10-07T12:00:00Z',
      })),
      http.put(`${base}/profile`, () => HttpResponse.json({ error: 'username already taken' }, { status: 409 })),
    );
    renderApp(<ProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit profile' }));
    await userEvent.type(screen.getByLabelText(/^Username/), 'taken');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('username already taken');
    expect(screen.getByLabelText(/^Username/)).toHaveValue('taken');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
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
