import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import VerifyPage from './pages/VerifyPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import { ROUTES } from './constants/routes';
import FavoritesPage from './pages/FavoritesPage';
import AboutPage from './pages/static/AboutPage';
import TermsPage from './pages/static/TermsPage';
import PrivacyPage from './pages/static/PrivacyPage';
import FaqPage from './pages/static/FaqPage';
import SellPage from './pages/seller/SellPage';
import MyProductsPage from './pages/seller/MyProductsPage';
import AdminDashboard from './pages/admin/AdminDashboard';

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
        <Route path={ROUTES.favorites} element={<FavoritesPage />} />
        <Route path={ROUTES.about} element={<AboutPage />} />
        <Route path={ROUTES.terms} element={<TermsPage />} />
        <Route path={ROUTES.privacy} element={<PrivacyPage />} />
        <Route path={ROUTES.faq} element={<FaqPage />} />
        <Route path={ROUTES.sell} element={<SellPage />} />
        <Route path={ROUTES.myProducts} element={<MyProductsPage />} />
        <Route path={ROUTES.adminDashboard} element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
