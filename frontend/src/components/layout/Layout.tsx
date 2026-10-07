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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={ROUTES.home} className="text-2xl font-bold text-teal-600">
            Marketplace 🛍️
          </Link>
          <nav className="flex items-center gap-4 text-sm">
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

      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
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
