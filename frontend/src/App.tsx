import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import { useAuth } from './auth/AuthContext';
import VerifyPage from './pages/VerifyPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import { ROUTES } from './constants/routes';

function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={ROUTES.home} className="text-2xl font-bold text-teal-600">
            Marketplace 🛍️
          </Link>

          <div className="flex items-center gap-4 text-sm">
            {user ? (
              <>
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
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path={ROUTES.home} element={<ProductsPage />} />
          <Route path={ROUTES.productDetail} element={<ProductDetailPage />} />
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.verify} element={<VerifyPage />} />
          <Route path={ROUTES.cart} element={<CartPage />} />
          <Route path={ROUTES.orders} element={<OrdersPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
