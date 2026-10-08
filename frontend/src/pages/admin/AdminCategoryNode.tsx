import { useState } from 'react';
import type { Category } from '../../types';

interface Props {
  category: Category;
  depth: number;
  onAddChild: (parentId: string, name: string) => void;
  onRename: (category: Category, name: string) => void;
  onDelete: (category: Category) => void;
}

export default function AdminCategoryNode({
  category,
  depth,
  onAddChild,
  onRename,
  onDelete,
}: Props) {
  const [mode, setMode] = useState<'view' | 'rename' | 'addChild'>('view');
  const [value, setValue] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
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
              onChange={(event) => setValue(event.target.value)}
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

      {mode === 'addChild' && (
        <form
          onSubmit={submit}
          className="flex gap-2 py-2"
          style={{ marginLeft: 20 }}
        >
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
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

      {category.children?.map((child) => (
        <AdminCategoryNode
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
