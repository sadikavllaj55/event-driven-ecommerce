import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import VerifyPage from './pages/VerifyPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import { ROUTES } from './constants/routes';

function App() {
  return (
    <Routes>
      {/* All pages share the Layout (header + outlet) */}
      <Route element={<Layout />}>
        <Route path={ROUTES.home} element={<ProductsPage />} />
        <Route path={ROUTES.productDetail} element={<ProductDetailPage />} />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.verify} element={<VerifyPage />} />
        <Route path={ROUTES.cart} element={<CartPage />} />
        <Route path={ROUTES.orders} element={<OrdersPage />} />
      </Route>
    </Routes>
  );
}

export default App;
