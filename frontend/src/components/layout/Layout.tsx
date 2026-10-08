import { Suspense } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../constants/routes';
import Footer from './Footer';
import RouteErrorBoundary from './RouteErrorBoundary';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl w-full mx-auto px-3 py-3 flex flex-col gap-3 sm:px-4 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link
            to={ROUTES.home}
            className="self-center text-xl font-bold text-teal-600 sm:text-2xl lg:self-auto"
          >
            Marketplace 🛍️
          </Link>
          <nav className="marketplace-nav flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm lg:w-auto lg:justify-end">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    to={ROUTES.adminDashboard}
                    className="text-purple-600 hover:underline font-medium"
                  >
                    Admin 📊
                  </Link>
                )}
                <Link
                  to={ROUTES.sell}
                  className="text-teal-600 hover:underline"
                >
                  Sell 🏷️
                </Link>
                <Link
                  to={ROUTES.myProducts}
                  className="text-teal-600 hover:underline"
                >
                  My Listings
                </Link>
                <Link
                  to={ROUTES.favorites}
                  className="text-teal-600 hover:underline"
                >
                  Favorites ❤️
                </Link>
                <Link
                  to={ROUTES.cart}
                  className="text-teal-600 hover:underline"
                >
                  Cart 🛒
                </Link>
                <Link
                  to={ROUTES.orders}
                  className="text-teal-600 hover:underline"
                >
                  Orders 📦
                </Link>
                <Link
                  to={ROUTES.myProfile}
                  className="text-gray-700 hover:text-teal-600 font-medium"
                >
                  👤 Profile
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate(ROUTES.home);
                  }}
                  className="text-teal-600 hover:underline"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to={ROUTES.login} className="text-teal-600 hover:underline">
                Log in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 py-4 w-full flex-1 sm:px-4 sm:py-6">
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
