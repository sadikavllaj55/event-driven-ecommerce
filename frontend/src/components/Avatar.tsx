const SIZES = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-lg',
  lg: 'w-20 h-20 text-2xl',
};

// Shows the avatar image, or the user's initials as a fallback
export default function Avatar({
  url,
  name,
  size = 'md',
}: {
  url?: string;
  name: string;
  size?: keyof typeof SIZES;
}) {
  const sizeClass = SIZES[size];
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?';

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClass} rounded-full object-cover border`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center`}
    >
      {initials}
    </div>
  );
}
