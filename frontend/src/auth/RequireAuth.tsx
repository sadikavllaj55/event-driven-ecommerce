import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ROUTES } from '../constants/routes';
import type { Role } from '../types';

export default function RequireAuth({ roles }: { roles?: readonly Role[] }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname + location.search + location.hash }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <section role="alert">
      <h1 className="text-xl font-semibold">Access denied</h1>
      <Link to={ROUTES.home} className="text-teal-600 hover:underline">Back to marketplace</Link>
    </section>;
  }
  return <Outlet />;
}