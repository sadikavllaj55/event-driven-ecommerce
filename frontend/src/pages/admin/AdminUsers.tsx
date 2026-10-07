import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import { queryKeys } from '../../api/queryKeys';
import { roleSchema } from '../../api/schemas';
import type { Role } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../utils/errors';

const roleStyles: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  seller: 'bg-blue-100 text-blue-700',
  buyer: 'bg-gray-100 text-gray-600',
};

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
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={ROUTES.adminDashboard}
          className="text-teal-600 hover:underline text-sm"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">User Management 👥</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users?.map((u) => {
              const isSelf = u.id === user.sub;
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.name}</div>
                    <div className="text-gray-500 text-xs">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        setRole.mutate({
                          id: u.id,
                          role: roleSchema.parse(e.target.value),
                        })
                      }
                      disabled={isSelf}
                      className={`text-xs rounded-full px-2 py-1 ${roleStyles[u.role] ?? ''} disabled:opacity-60`}
                    >
                      <option value="buyer">buyer</option>
                      <option value="seller">seller</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        u.status === 'banned'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      <span className="text-gray-400 text-xs">You</span>
                    ) : u.status === 'banned' ? (
                      <button
                        onClick={() =>
                          setStatus.mutate({ id: u.id, status: 'active' })
                        }
                        className="text-teal-600 hover:underline"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setStatus.mutate({ id: u.id, status: 'banned' })
                        }
                        className="text-red-500 hover:underline"
                      >
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
