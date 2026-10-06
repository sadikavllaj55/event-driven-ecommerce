const SIZES = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-lg',
  lg: 'w-20 h-20 text-2xl',
};

// Shows the avatar image, or the first letter of the name as a fallback
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
      {name.charAt(0).toUpperCase() || '?'}
    </div>
  );
}
