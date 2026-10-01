import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import { useAuth } from './auth/AuthContext';
import VerifyPage from './pages/VerifyPage';
import CartPage from './pages/CartPage';

function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-teal-600">
            Marketplace 🛍️
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                <Link to="/cart" className="text-teal-600 hover:underline">
                  Cart 🛒
                </Link>
                <span className="text-gray-600">Hi, {user.email}</span>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="text-teal-600 hover:underline"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="text-teal-600 hover:underline">
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
