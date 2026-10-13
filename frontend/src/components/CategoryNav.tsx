import { queryKeys } from '../api/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../api/categories';

interface Props {
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

export default function CategoryNav({ selected, onSelect }: Props) {
  const { data: categories } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: categoryApi.list,
  });

  // Top-level categories only (roots of the tree)
  const roots = categories ?? [];

  if (roots.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/15 ${
          selected === null
            ? 'border-[var(--market-primary)] bg-[var(--market-primary)] text-white'
            : 'border-[var(--market-border)] bg-white text-gray-600 hover:border-[var(--market-primary)]/40 hover:bg-[var(--market-primary-soft)] hover:text-[var(--market-ink)]'
        }`}
      >
        All
      </button>
      {roots.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          aria-pressed={selected === cat.id}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/15 ${
            selected === cat.id
              ? 'border-[var(--market-primary)] bg-[var(--market-primary)] text-white'
              : 'border-[var(--market-border)] bg-white text-gray-600 hover:border-[var(--market-primary)]/40 hover:bg-[var(--market-primary-soft)] hover:text-[var(--market-ink)]'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
