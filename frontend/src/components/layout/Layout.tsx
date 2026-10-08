import { Suspense } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  type NavLinkRenderProps,
} from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../constants/routes';
import Footer from './Footer';
import RouteErrorBoundary from './RouteErrorBoundary';

const navLinkClass = ({ isActive }: NavLinkRenderProps) =>
  `inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--market-primary)]/30 ${
    isActive
      ? 'bg-[var(--market-primary-soft)] text-[var(--market-ink)]'
      : 'text-gray-600 hover:bg-[var(--market-page)] hover:text-[var(--market-ink)]'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--market-page)]">
      <header className="sticky top-0 z-30 border-b border-[var(--market-border)] bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link
            to={ROUTES.home}
            className="group flex self-center items-center gap-2.5 rounded-lg text-[var(--market-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--market-primary)]/30 lg:self-auto"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--market-primary)] text-sm font-bold text-white shadow-sm transition-transform duration-150 group-hover:-rotate-3 motion-reduce:transition-none">
              M
            </span>
            <span className="text-xl font-bold sm:text-2xl">Marketplace</span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="marketplace-nav flex w-full flex-wrap items-center justify-center gap-1 lg:w-auto lg:justify-end"
          >
            {user ? (
              <>
                {user.role === 'admin' && (
                  <NavLink
                    to={ROUTES.adminDashboard}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-[var(--market-accent)] transition-colors hover:bg-[var(--market-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--market-accent)]/30"
                  >
                    Admin
                  </NavLink>
                )}
                <NavLink to={ROUTES.sell} className={navLinkClass}>
                  Sell an item
                </NavLink>
                <NavLink to={ROUTES.myProducts} className={navLinkClass}>
                  My Listings
                </NavLink>
                <NavLink to={ROUTES.favorites} className={navLinkClass}>
                  Favorites
                </NavLink>
                <NavLink to={ROUTES.cart} className={navLinkClass}>
                  Cart
                </NavLink>
                <NavLink to={ROUTES.orders} className={navLinkClass}>
                  Orders
                </NavLink>
                <NavLink to={ROUTES.myProfile} className={navLinkClass}>
                  Profile
                </NavLink>
                <button
                  onClick={() => {
                    logout();
                    navigate(ROUTES.home);
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                to={ROUTES.login}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--market-primary)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--market-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/20"
              >
                Log in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-5 sm:py-8">
        <RouteErrorBoundary key={location.pathname}>
          <Suspense
            fallback={
              <p role="status" className="text-gray-500">
                Loading page...
              </p>
            }
          >
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </main>

      <Footer />
    </div>
  );
}
