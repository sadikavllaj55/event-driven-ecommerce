import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import { queryKeys } from '../../api/queryKeys';
import type { Role } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../utils/errors';
import AdminUserList from './AdminUserList';

export default function AdminUsers() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: queryKeys.adminUsers(user?.sub),
    queryFn: adminApi.listUsers,
    enabled: user?.role === 'admin',
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.setUserStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers(user?.sub) });
      qc.invalidateQueries({ queryKey: queryKeys.adminStats(user?.sub) });
      toast.success('Status updated');
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, 'Failed to update status')),
  });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      adminApi.setUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers(user?.sub) });
      qc.invalidateQueries({ queryKey: queryKeys.adminStats(user?.sub) });
      toast.success('Role updated');
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, 'Failed to update role')),
  });

  if (user?.role !== 'admin') return <Navigate to={ROUTES.home} replace />;
  if (isLoading) return <p className="text-gray-500">Loading users…</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to={ROUTES.adminDashboard}
          className="text-teal-600 hover:underline text-sm"
        >
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          User Management 👥
        </h1>
      </div>

      <AdminUserList
        users={users ?? []}
        currentUserId={user.sub}
        onRoleChange={(id, role) => setRole.mutate({ id, role })}
        onStatusChange={(id, status) => setStatus.mutate({ id, status })}
      />
    </div>
  );
}
