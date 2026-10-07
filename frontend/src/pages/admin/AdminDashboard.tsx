import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../constants/routes';

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.adminStats(user?.sub),
    queryFn: adminApi.stats,
    enabled: user?.role === 'admin',
  });

  // Admin-only guard
  if (user?.role !== 'admin') {
    return <Navigate to={ROUTES.home} replace />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Admin Dashboard 📊
      </h1>

      {isLoading && <p className="text-gray-500">Loading stats…</p>}

      {stats && (
        <>
          {/* Users */}
          <Section title="Users 👥">
            <StatCard label="Total" value={stats.users.total} />
            <StatCard label="Buyers" value={stats.users.buyers} />
            <StatCard label="Sellers" value={stats.users.sellers} />
            <StatCard label="Admins" value={stats.users.admins} />
            <StatCard label="Banned" value={stats.users.banned} accent="red" />
          </Section>

          {/* Products */}
          <Section title="Products 🛍️">
            <StatCard label="Total" value={stats.products.total} />
            <StatCard
              label="Active"
              value={stats.products.active}
              accent="green"
            />
            <StatCard label="Inactive" value={stats.products.inactive} />
            <StatCard
              label="Deleted"
              value={stats.products.deleted}
              accent="red"
            />
          </Section>

          {/* Orders */}
          <Section title="Orders 📦">
            <StatCard label="Total" value={stats.orders.total} />
            <StatCard label="Paid" value={stats.orders.paid} accent="green" />
            <StatCard
              label="Revenue"
              value={`€${stats.orders.revenue}`}
              accent="teal"
            />
          </Section>
        </>
      )}

      {/* Quick links */}
      <div className="mt-8 flex gap-3">
        <Link
          to={ROUTES.adminUsers}
          className="bg-teal-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-teal-700"
        >
          Manage Users →
        </Link>
        <Link
          to={ROUTES.adminCategories}
          className="bg-white text-teal-700 border border-teal-600 px-5 py-3 rounded-lg font-medium hover:bg-teal-50"
        >
          Manage Categories →
        </Link>
        <Link
          to={ROUTES.adminSettings}
          className="bg-white text-teal-700 border border-teal-600 px-5 py-3 rounded-lg font-medium hover:bg-teal-50"
        >
          Settings →
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {children}
      </div>
    </div>
  );
}

const accentColors: Record<string, string> = {
  green: 'text-green-600',
  red: 'text-red-600',
  teal: 'text-teal-600',
  default: 'text-gray-900',
};

function StatCard({
  label,
  value,
  accent = 'default',
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`text-2xl font-bold ${accentColors[accent] ?? accentColors.default}`}
      >
        {value}
      </p>
    </div>
  );
}
