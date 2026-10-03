import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../api/categories';

interface Props {
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

export default function CategoryNav({ selected, onSelect }: Props) {
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
  });

  // Top-level categories only (roots of the tree)
  const roots = categories ?? [];

  if (roots.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
          selected === null
            ? 'bg-teal-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
      >
        All
      </button>
      {roots.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selected === cat.id
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
