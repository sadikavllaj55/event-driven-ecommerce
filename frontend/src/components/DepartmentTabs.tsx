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
    <div className="flex items-center justify-center gap-2 mb-6">
      {DEPARTMENTS.map((dept) => {
        const isActive = selected === dept.value;
        return (
          <button
            key={dept.label}
            onClick={() => onSelect(dept.value)}
            className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
              isActive
                ? 'bg-teal-600 text-white shadow-md scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="mr-1">{dept.emoji}</span>
            {dept.label}
          </button>
        );
      })}
    </div>
  );
}
