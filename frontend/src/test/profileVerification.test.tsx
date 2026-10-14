import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import AdminUsers from '../pages/admin/AdminUsers';
import ProfilePage from '../pages/ProfilePage';
import SellerShopPage from '../pages/SellerShopPage';
import ProductPurchasePanel from '../pages/ProductPurchasePanel';
import MemberSearchResults from '../components/MemberSearchResults';
import AccountMenu from '../components/layout/AccountMenu';
import { queryKeys } from '../api/queryKeys';
import type { AdminUser } from '../api/admin';
import { product, renderApp, tokenFor } from './helpers';
import { server } from './setup';

const base = 'http://localhost:8080';
const profile = {
  id: 'member',
  name: 'Alex Rivera',
  username: 'alex_rivera',
  avatar_url: '',
  bio: '',
  created_at: '2026-10-07T12:00:00Z',
  profile_verified: true,
};
const account: AdminUser = {
  id: 'member', name: profile.name, email: 'alex@example.com',
  role: 'buyer', status: 'active', verified: true,
  profile_verified: false, created_at: profile.created_at,
};

describe('admin profile verification', () => {
  it('verifies and revokes profiles and invalidates identity caches', async () => {
    localStorage.setItem('token', tokenFor('admin', 'admin'));
    let verified = false;
    const updates: unknown[] = [];
    server.use(
      http.get(`${base}/admin/users`, () => HttpResponse.json([
        { ...account, profile_verified: verified },
        { ...account, id: 'admin', name: 'Admin', role: 'admin' },
      ])),
      http.patch(`${base}/admin/users/member/profile-verification`, async ({ request }) => {
        const body = await request.json() as { profile_verified: boolean };
        updates.push(body);
        verified = body.profile_verified;
        return HttpResponse.json(body);
      }),
    );
    const { client } = renderApp(<AdminUsers />);
    client.setQueryData(queryKeys.profile('member'), profile);
    client.setQueryData(queryKeys.accountProfile('member'), profile);
    client.setQueryData(['members', 'Alex'], [profile]);
    const buttons = await screen.findAllByRole('button', { name: 'Verify profile for Alex Rivera' });
    expect(screen.queryByRole('img', { name: 'Admin-verified profile' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Verify profile for Admin' })[0]).toBeDisabled();
    await userEvent.click(buttons[0]);
    await screen.findAllByRole('button', { name: 'Revoke verification for Alex Rivera' });
    expect(screen.getAllByRole('img', { name: 'Admin-verified profile' })).toHaveLength(2);
    for (const key of [queryKeys.profile('member'), queryKeys.accountProfile('member'), ['members', 'Alex']]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Revoke verification for Alex Rivera' })[0]).toBeEnabled());
    await userEvent.click(screen.getAllByRole('button', { name: 'Revoke verification for Alex Rivera' })[0]);
    await screen.findAllByRole('button', { name: 'Verify profile for Alex Rivera' });
    expect(screen.queryByRole('img', { name: 'Admin-verified profile' })).not.toBeInTheDocument();
    expect(updates).toEqual([{ profile_verified: true }, { profile_verified: false }]);
  });

  it('leaves badges unchanged when verification fails', async () => {
    localStorage.setItem('token', tokenFor('admin', 'admin'));
    server.use(
      http.get(`${base}/admin/users`, () => HttpResponse.json([account])),
      http.patch(`${base}/admin/users/member/profile-verification`, () =>
        HttpResponse.json({ error: 'Verification failed' }, { status: 500 })),
    );
    renderApp(<AdminUsers />);
    await userEvent.click((await screen.findAllByRole('button', { name: 'Verify profile for Alex Rivera' }))[0]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Verify profile for Alex Rivera' })[0]).toBeEnabled());
    expect(screen.queryByRole('img', { name: 'Admin-verified profile' })).not.toBeInTheDocument();
  });

  it.each([true, false])('shows badges on member and product identities only when verified=%s', (verified) => {
    renderApp(
      <>
        <MemberSearchResults search="Alex" members={[{ ...profile, profile_verified: verified }]} isLoading={false} isError={false} isFetching={false} />
        <ProductPurchasePanel product={{ ...product, condition: 'good', gender: 'unisex', status: 'active' }} sellerProfile={{ ...profile, profile_verified: verified }} isAddingToCart={false} onAddToCart={vi.fn()} />
      </>,
    );
    expect(screen.queryAllByRole('img', { name: 'Admin-verified profile' })).toHaveLength(verified ? 2 : 0);
  });

  it('shows the badge on the account profile and account menu', async () => {
    localStorage.setItem('token', tokenFor('member'));
    server.use(
      http.get(`${base}/profile`, () => HttpResponse.json({
        ...profile, email: account.email, phone: '', location: '',
      })),
      http.get(`${base}/users/member/profile`, () => HttpResponse.json(profile)),
    );
    renderApp(<><ProfilePage /><AccountMenu /></>);
    await screen.findByRole('img', { name: 'Admin-verified profile' });
    await userEvent.click(await screen.findByRole('button', { name: 'Open account menu for Alex Rivera' }));
    expect(screen.getAllByRole('img', { name: 'Admin-verified profile' }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the badge in the public shop', async () => {
    server.use(
      http.get(`${base}/users/member/profile`, () => HttpResponse.json(profile)),
      http.get(`${base}/sellers/member/products`, () => HttpResponse.json({ products: [], total: 0, page: 1, limit: 20 })),
    );
    renderApp(<Routes><Route path="/sellers/:id" element={<SellerShopPage />} /></Routes>, '/sellers/member');
    expect(await screen.findByRole('img', { name: 'Admin-verified profile' })).toBeInTheDocument();
  });
});
