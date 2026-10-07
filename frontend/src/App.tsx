import { lazy } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProductsPage from './pages/ProductsPage';
import { ROUTES } from './constants/routes';
import RequireAuth from './auth/RequireAuth';

const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const AboutPage = lazy(() => import('./pages/static/AboutPage'));
const TermsPage = lazy(() => import('./pages/static/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/static/PrivacyPage'));
const FaqPage = lazy(() => import('./pages/static/FaqPage'));
const SellPage = lazy(() => import('./pages/seller/SellPage'));
const MyProductsPage = lazy(() => import('./pages/seller/MyProductsPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const EditProductPage = lazy(() => import('./pages/seller/EditProductPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SellerShopPage = lazy(() => import('./pages/SellerShopPage'));

function App() {
  return (
    <Routes>
      {/* All pages share the Layout (header + outlet) */}
      <Route element={<Layout />}>
        <Route path={ROUTES.home} element={<ProductsPage />} />
        <Route path={ROUTES.productDetail} element={<ProductDetailPage />} />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.verify} element={<VerifyPage />} />
        <Route path={ROUTES.about} element={<AboutPage />} />
        <Route path={ROUTES.terms} element={<TermsPage />} />
        <Route path={ROUTES.privacy} element={<PrivacyPage />} />
        <Route path={ROUTES.faq} element={<FaqPage />} />
        <Route path={ROUTES.sellerShop} element={<SellerShopPage />} />
        <Route element={<RequireAuth />}>
          <Route path={ROUTES.cart} element={<CartPage />} />
          <Route path={ROUTES.orders} element={<OrdersPage />} />
          <Route path={ROUTES.favorites} element={<FavoritesPage />} />
          <Route path={ROUTES.sell} element={<SellPage />} />
          <Route path={ROUTES.myProducts} element={<MyProductsPage />} />
          <Route path={ROUTES.productEdit} element={<EditProductPage />} />
          <Route path={ROUTES.myProfile} element={<ProfilePage />} />
        </Route>
        <Route element={<RequireAuth roles={['admin']} />}>
          <Route path={ROUTES.adminDashboard} element={<AdminDashboard />} />
          <Route path={ROUTES.adminUsers} element={<AdminUsers />} />
          <Route path={ROUTES.adminCategories} element={<AdminCategories />} />
          <Route path={ROUTES.adminSettings} element={<AdminSettings />} />
        </Route>
        <Route
          path="*"
          element={
            <section>
              <h1 className="text-xl font-semibold mb-3">Page not found</h1>
              <Link to={ROUTES.home} className="text-teal-600 hover:underline">
                Back to marketplace
              </Link>
            </section>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
