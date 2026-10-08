import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { categoryApi } from '../../api/categories';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../utils/errors';
import { queryKeys } from '../../api/queryKeys';
import AdminCategoryNode from './AdminCategoryNode';

export default function AdminCategories() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: categoryApi.list,
  });

  // Invalidating ['categories'] also refreshes the homepage nav + Sell form dropdown
  const refresh = () =>
    qc.invalidateQueries({ queryKey: queryKeys.categories });

  const create = useMutation({
    mutationFn: ({
      name,
      parentId,
    }: {
      name: string;
      parentId: string | null;
    }) => categoryApi.create(name, parentId),
    onSuccess: () => {
      refresh();
      toast.success('Category created');
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, 'Failed to create category')),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      name,
      parentId,
    }: {
      id: string;
      name: string;
      parentId: string | null;
    }) => categoryApi.update(id, name, parentId),
    onSuccess: () => {
      refresh();
      toast.success('Category renamed');
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, 'Failed to rename category')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => categoryApi.remove(id),
    onSuccess: () => {
      refresh();
      toast.success('Category deleted');
    },
    // Backend returns 409 "category has children..." — shown here
    onError: (err) =>
      toast.error(getErrorMessage(err, 'Failed to delete category')),
  });

  if (user?.role !== 'admin') return <Navigate to={ROUTES.home} replace />;
  if (isLoading) return <p className="text-gray-500">Loading categories…</p>;

  function handleAddRoot(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    create.mutate(
      { name: newName.trim(), parentId: null },
      { onSuccess: () => setNewName('') },
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to={ROUTES.adminDashboard}
          className="text-teal-600 hover:underline text-sm"
        >
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          Categories 🏷️
        </h1>
      </div>

      {/* Add top-level category */}
      <form
        onSubmit={handleAddRoot}
        className="mb-6 flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New top-level category (e.g. Shoes)"
          className="min-w-0 flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button className="whitespace-nowrap bg-teal-600 text-white px-4 py-2 rounded font-medium hover:bg-teal-700">
          + Add
        </button>
      </form>

      {/* Tree */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        {(!categories || categories.length === 0) && (
          <p className="text-gray-500 text-sm">No categories yet.</p>
        )}
        {categories?.map((cat) => (
          <AdminCategoryNode
            key={cat.id}
            category={cat}
            depth={0}
            onAddChild={(parentId, name) => create.mutate({ name, parentId })}
            onRename={(c, name) =>
              update.mutate({ id: c.id, name, parentId: c.parent_id })
            }
            onDelete={(c) => {
              if (window.confirm(`Delete "${c.name}"?`)) remove.mutate(c.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}
