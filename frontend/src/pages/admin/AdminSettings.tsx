import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi, type Setting } from '../../api/admin';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../utils/errors';

// Human-friendly metadata for known setting keys.
// Unknown keys still render (as plain text inputs) — new settings need no UI change.
const SETTING_META: Record<
  string,
  { label: string; description: string; type: 'number' | 'text'; min?: number }
> = {
  max_images_per_product: {
    label: 'Max images per product',
    description: 'How many photos a seller can upload per listing.',
    type: 'number',
    min: 1,
  },
};

export default function AdminSettings() {
  const { user } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.adminSettings(user?.sub),
    queryFn: adminApi.listSettings,
    enabled: user?.role === 'admin',
  });

  if (user?.role !== 'admin') return <Navigate to={ROUTES.home} replace />;
  if (isLoading) return <p className="text-gray-500">Loading settings…</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={ROUTES.adminDashboard}
          className="text-teal-600 hover:underline text-sm"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Settings ⚙️</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm divide-y">
        {(!settings || settings.length === 0) && (
          <p className="p-4 text-gray-500 text-sm">No settings found.</p>
        )}
        {settings?.map((s) => (
          <SettingRow key={s.key} setting={s} />
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Changes take effect immediately — no redeploy needed.
      </p>
    </div>
  );
}

// Each row owns its own edit state, so editing one setting doesn't affect others
function SettingRow({ setting }: { setting: Setting }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const meta = SETTING_META[setting.key];
  const [value, setValue] = useState(setting.value);
  const isDirty = value !== setting.value;

  const save = useMutation({
    mutationFn: () => adminApi.updateSetting(setting.key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSettings(user?.sub) });
      qc.invalidateQueries({ queryKey: queryKeys.publicSettings });
      toast.success('Setting saved');
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, 'Failed to save setting')),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      toast.error('Value cannot be empty');
      return;
    }
    save.mutate();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 flex items-center justify-between gap-4"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">
          {meta?.label ?? setting.key}
        </p>
        {meta?.description && (
          <p className="text-sm text-gray-500">{meta.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Last updated {new Date(setting.updated_at).toLocaleString()}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type={meta?.type ?? 'text'}
          min={meta?.min}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="submit"
          disabled={!isDirty || save.isPending}
          className="bg-teal-600 text-white px-4 py-2 rounded font-medium hover:bg-teal-700 disabled:opacity-40"
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
