import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../constants/routes';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={ROUTES.home} className="text-2xl font-bold text-teal-600">
            Marketplace 🛍️
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {user ? (
              <>
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
                <span className="text-gray-600">Hi, {user.email}</span>
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

      {/* Pages render here */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
