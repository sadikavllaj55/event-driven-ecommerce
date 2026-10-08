import type { AdminUser } from '../../api/admin';
import { roleSchema } from '../../api/schemas';
import type { Role } from '../../types';

const roleStyles: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  seller: 'bg-blue-100 text-blue-700',
  buyer: 'bg-gray-100 text-gray-600',
};

interface Props {
  users: AdminUser[];
  currentUserId: string;
  onRoleChange: (id: string, role: Role) => void;
  onStatusChange: (id: string, status: 'active' | 'banned') => void;
}

export default function AdminUserList({
  users,
  currentUserId,
  onRoleChange,
  onStatusChange,
}: Props) {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        {users.map((account) => {
          const isSelf = account.id === currentUserId;
          return (
            <article
              key={account.id}
              className="rounded-lg bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <UserIdentity account={account} />
                <UserStatus account={account} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
                <RoleSelect
                  account={account}
                  disabled={isSelf}
                  onChange={onRoleChange}
                />
                <StatusAction
                  account={account}
                  isSelf={isSelf}
                  onChange={onStatusChange}
                />
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-lg bg-white shadow-sm sm:block">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((account) => {
              const isSelf = account.id === currentUserId;
              return (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <UserIdentity account={account} />
                  </td>
                  <td className="px-4 py-3">
                    <RoleSelect
                      account={account}
                      disabled={isSelf}
                      onChange={onRoleChange}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <UserStatus account={account} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusAction
                      account={account}
                      isSelf={isSelf}
                      onChange={onStatusChange}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UserIdentity({ account }: { account: AdminUser }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium text-gray-900">{account.name}</div>
      <div className="break-all text-xs text-gray-500">{account.email}</div>
    </div>
  );
}

function RoleSelect({
  account,
  disabled,
  onChange,
}: {
  account: AdminUser;
  disabled: boolean;
  onChange: Props['onRoleChange'];
}) {
  return (
    <select
      aria-label={`Role for ${account.name}`}
      value={account.role}
      onChange={(event) =>
        onChange(account.id, roleSchema.parse(event.target.value))
      }
      disabled={disabled}
      className={`max-w-full rounded-full px-2 py-1 text-xs ${roleStyles[account.role] ?? ''} disabled:opacity-60`}
    >
      <option value="buyer">buyer</option>
      <option value="seller">seller</option>
      <option value="admin">admin</option>
    </select>
  );
}

function UserStatus({ account }: { account: AdminUser }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-xs ${
        account.status === 'banned'
          ? 'bg-red-100 text-red-700'
          : 'bg-green-100 text-green-700'
      }`}
    >
      {account.status}
    </span>
  );
}

function StatusAction({
  account,
  isSelf,
  onChange,
}: {
  account: AdminUser;
  isSelf: boolean;
  onChange: Props['onStatusChange'];
}) {
  if (isSelf) return <span className="text-xs text-gray-400">You</span>;

  const nextStatus = account.status === 'banned' ? 'active' : 'banned';
  return (
    <button
      onClick={() => onChange(account.id, nextStatus)}
      className={`whitespace-nowrap hover:underline ${account.status === 'banned' ? 'text-teal-600' : 'text-red-500'}`}
    >
      {account.status === 'banned' ? 'Reactivate' : 'Ban'}
    </button>
  );
}
