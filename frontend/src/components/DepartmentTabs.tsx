interface Props {
  selected: string | null;
  onSelect: (gender: string | null) => void;
}

const DEPARTMENTS = [
  { value: null, label: 'All', emoji: '✨' },
  { value: 'women', label: 'Women', emoji: '👗' },
  { value: 'men', label: 'Men', emoji: '👔' },
  { value: 'kids', label: 'Kids', emoji: '🧸' },
  { value: 'unisex', label: 'Unisex', emoji: '👕' },
];

export default function DepartmentTabs({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {DEPARTMENTS.map((dept) => {
        const isActive = selected === dept.value;
        return (
          <button
            key={dept.label}
            onClick={() => onSelect(dept.value)}
            aria-pressed={isActive}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/15 sm:px-5 ${
              isActive
                ? 'border-[var(--market-primary)] bg-[var(--market-primary)] text-white shadow-sm'
                : 'border-[var(--market-border)] bg-white text-gray-600 hover:border-[var(--market-primary)]/40 hover:bg-[var(--market-primary-soft)] hover:text-[var(--market-ink)]'
            }`}
          >
            <span aria-hidden="true">{dept.emoji}</span>
            {dept.label}
          </button>
        );
      })}
    </div>
  );
}
