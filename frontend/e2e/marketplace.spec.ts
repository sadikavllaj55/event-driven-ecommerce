import { expect, test, type Page } from '@playwright/test';

const product = {
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

const order = {
  id: 'order-1',
  buyer_id: 'buyer-1',
  status: 'pending',
  total_cents: 2500,
  items: [{ product_id: product.id, quantity: 1, price_cents: 2500 }],
  created_at: '2026-10-07T12:00:00Z',
};

async function mockApi(page: Page) {
  let placed = false;
  let orderReads = 0;
  let checkouts = 0;
  const claims = {
    sub: 'buyer-1',
    email: 'buyer@example.com',
    role: 'buyer',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const token = `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
  await page.route('http://127.0.0.1:8080/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/login') {
      if (request.postDataJSON().password !== 'correct-password') {
        return route.fulfill({
          status: 401,
          json: { error: 'Invalid credentials' },
        });
      }
      return route.fulfill({ json: { token } });
    }
    if (path === '/products')
      return route.fulfill({
        json: { products: [product], total: 1, page: 1, limit: 12 },
      });
    if (path === '/products/product-1') return route.fulfill({ json: product });
    if (path === '/categories' || path === '/favorites')
      return route.fulfill({ json: [] });
    if (path === '/cart')
      return route.fulfill({
        json: { buyer_id: 'buyer-1', items: placed ? [] : order.items },
      });
    if (path === '/cart/checkout') {
      expect(request.headers().authorization).toBe(`Bearer ${token}`);
      placed = true;
      checkouts += 1;
      return route.fulfill({ json: order });
    }
    if (path === '/orders') {
      const status = orderReads++ === 0 ? 'pending' : 'paid';
      return route.fulfill({ json: placed ? [{ ...order, status }] : [] });
    }
    throw new Error(`Unexpected API request: ${request.method()} ${path}`);
  });
  return { checkoutCount: () => checkouts };
}

test('guests browse without redirecting and invalid login stays recoverable', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByText('Blue jacket')).toBeVisible();
  await expect(page).toHaveURL('/');
  await page.getByRole('link', { name: 'Log in', exact: true }).click();
  await page
    .getByPlaceholder('Email', { exact: true })
    .fill('buyer@example.com');
  await page
    .getByPlaceholder('Password', { exact: true })
    .fill('wrong-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByText('Invalid credentials')).toBeVisible();
  await expect(page).toHaveURL('/login');
  await page
    .getByPlaceholder('Password', { exact: true })
    .fill('correct-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
});

test('login returns to cart and checkout progresses to paid', async ({
  page,
}) => {
  const api = await mockApi(page);
  await page.goto('/cart');
  await expect(
    page.getByRole('heading', { name: 'Log in', exact: true }),
  ).toBeVisible();
  await page
    .getByPlaceholder('Email', { exact: true })
    .fill('buyer@example.com');
  await page
    .getByPlaceholder('Password', { exact: true })
    .fill('correct-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL('/cart');
  await expect(page.getByText('Blue jacket')).toBeVisible();
  await page.getByRole('button', { name: /checkout/i }).click();
  await expect(
    page.getByRole('heading', { name: /order placed/i }),
  ).toBeVisible();
  expect(api.checkoutCount()).toBe(1);
  await page.getByRole('link', { name: /view orders/i }).click();
  await expect(page.getByText('pending', { exact: true })).toBeVisible();
  await expect(page.getByText('paid', { exact: true })).toBeVisible();
});
