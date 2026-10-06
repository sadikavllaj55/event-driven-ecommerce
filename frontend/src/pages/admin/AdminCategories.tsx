import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { categoryApi } from '../../api/categories';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../utils/errors';
import type { Category } from '../../types';

export default function AdminCategories() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
  });

  // Invalidating ['categories'] also refreshes the homepage nav + Sell form dropdown
  const refresh = () => qc.invalidateQueries({ queryKey: ['categories'] });

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
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={ROUTES.adminDashboard}
          className="text-teal-600 hover:underline text-sm"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Categories 🏷️</h1>
      </div>

      {/* Add top-level category */}
      <form onSubmit={handleAddRoot} className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New top-level category (e.g. Shoes)"
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button className="bg-teal-600 text-white px-4 py-2 rounded font-medium hover:bg-teal-700">
          + Add
        </button>
      </form>

      {/* Tree */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        {(!categories || categories.length === 0) && (
          <p className="text-gray-500 text-sm">No categories yet.</p>
        )}
        {categories?.map((cat) => (
          <CategoryNode
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

interface NodeProps {
  category: Category;
  depth: number;
  onAddChild: (parentId: string, name: string) => void;
  onRename: (category: Category, name: string) => void;
  onDelete: (category: Category) => void;
}

// Recursive node — renders itself, then its children one level deeper
function CategoryNode({
  category,
  depth,
  onAddChild,
  onRename,
  onDelete,
}: NodeProps) {
  const [mode, setMode] = useState<'view' | 'rename' | 'addChild'>('view');
  const [value, setValue] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    if (mode === 'rename') onRename(category, name);
    if (mode === 'addChild') onAddChild(category.id, name);
    setMode('view');
    setValue('');
  }

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="flex items-center justify-between py-2 border-b last:border-0 group">
        {mode === 'rename' ? (
          <form onSubmit={submit} className="flex gap-2 flex-1">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 px-2 py-1 border rounded text-sm"
            />
            <button className="text-teal-600 text-sm">Save</button>
            <button
              type="button"
              onClick={() => setMode('view')}
              className="text-gray-400 text-sm"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <span className="text-gray-900">
              {depth > 0 && <span className="text-gray-300 mr-1">└</span>}
              {category.name}
            </span>
            <div className="flex gap-3 text-sm opacity-60 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  setMode('addChild');
                  setValue('');
                }}
                className="text-teal-600 hover:underline"
              >
                + Child
              </button>
              <button
                onClick={() => {
                  setMode('rename');
                  setValue(category.name);
                }}
                className="text-gray-600 hover:underline"
              >
                Rename
              </button>
              <button
                onClick={() => onDelete(category)}
                className="text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Inline "add child" form */}
      {mode === 'addChild' && (
        <form
          onSubmit={submit}
          className="flex gap-2 py-2"
          style={{ marginLeft: 20 }}
        >
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Subcategory of ${category.name}`}
            className="flex-1 px-2 py-1 border rounded text-sm"
          />
          <button className="text-teal-600 text-sm">Add</button>
          <button
            type="button"
            onClick={() => setMode('view')}
            className="text-gray-400 text-sm"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Children (recursion) */}
      {category.children?.map((child) => (
        <CategoryNode
          key={child.id}
          category={child}
          depth={depth + 1}
          onAddChild={onAddChild}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
