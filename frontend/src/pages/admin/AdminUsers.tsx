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

  const { data: users, isLoading, isError, refetch } = useQuery({
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

  const setVerification = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      adminApi.setProfileVerification(id, verified),
    onSuccess: async (_, { id, verified }) => {
      toast.success(verified ? 'Profile verified' : 'Profile verification revoked');
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.adminUsers(user?.sub) }),
        qc.invalidateQueries({ queryKey: queryKeys.profile(id) }),
        qc.invalidateQueries({ queryKey: queryKeys.accountProfile(id) }),
        qc.invalidateQueries({ queryKey: ['members'] }),
      ]);
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, 'Failed to update profile verification')),
  });

  if (user?.role !== 'admin') return <Navigate to={ROUTES.home} replace />;
  if (isLoading) return <p className="text-gray-500">Loading users…</p>;
  if (isError) return (
    <div role="alert">
      <p className="text-red-700">Failed to load users.</p>
      <button onClick={() => void refetch()} className="mt-2 text-teal-600 hover:underline">Try again</button>
    </div>
  );

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
        onVerificationChange={(id, verified) => setVerification.mutate({ id, verified })}
        verificationPending={setVerification.isPending}
      />
    </div>
  );
}
