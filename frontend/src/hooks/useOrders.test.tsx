import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { expect, it, vi } from 'vitest';
import OrdersPage from '../pages/OrdersPage';
import { useCart } from './useCart';
import { server } from '../test/setup';
import { order, renderApp, tokenFor } from '../test/helpers';

const base = 'http://localhost:8080';

it('polls nonterminal saga states and stops after payment completes', async () => {
  localStorage.setItem('token', tokenFor('buyer-1'));
  let requests = 0;
  server.use(
    http.get(`${base}/orders`, () => {
      const status = ['pending', 'stock_reserved', 'paid'][
        Math.min(requests++, 2)
      ];
      return HttpResponse.json([{ ...order, status }]);
    }),
  );
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  try {
    renderApp(<OrdersPage />);
    await screen.findByText('pending');
    await act(() => vi.advanceTimersByTimeAsync(2000));
    await screen.findByText('stock_reserved');
    await act(() => vi.advanceTimersByTimeAsync(2000));
    await screen.findByText('paid');
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(requests).toBe(3);
  } finally {
    vi.useRealTimers();
  }
});

function CheckoutProbe() {
  const { checkout } = useCart();
  return <button onClick={() => checkout.mutate()}>Checkout</button>;
}

it('refreshes an already cached orders list after checkout', async () => {
  localStorage.setItem('token', tokenFor('buyer-1'));
  let placed = false;
  server.use(
    http.get(`${base}/cart`, () =>
      HttpResponse.json({ buyer_id: 'buyer-1', items: [] }),
    ),
    http.get(`${base}/orders`, () => HttpResponse.json(placed ? [order] : [])),
    http.post(`${base}/cart/checkout`, () => {
      placed = true;
      return HttpResponse.json(order);
    }),
  );
  renderApp(
    <>
      <OrdersPage />
      <CheckoutProbe />
    </>,
  );
  await screen.findByText('No orders yet.');
  await userEvent.click(screen.getByRole('button', { name: 'Checkout' }));
  await waitFor(() => expect(screen.getByText('pending')).toBeInTheDocument());
});
