import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import Layout from './Layout';
import { renderApp } from '../../test/helpers';

function BrokenPage(): never {
  throw new Error('Page render failed');
}

it('keeps navigation usable after a route fails and resets on navigation', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  renderApp(
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<BrokenPage />} />
        <Route path="/login" element={<h1>Working page</h1>} />
      </Route>
    </Routes>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'This page could not be loaded',
  );
  await userEvent.click(screen.getByRole('link', { name: 'Log in' }));
  expect(
    screen.getByRole('heading', { name: 'Working page' }),
  ).toBeInTheDocument();
});
