import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../constants/routes';

// Background image per department (free Unsplash images)
const BACKGROUNDS: Record<string, string> = {
  all: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
  women:
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80',
  men: 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=1200&q=80',
  kids: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=1200&q=80',
  unisex:
    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200&q=80',
};

export default function Hero({ department }: { department: string | null }) {
  const { user } = useAuth();
  const bg = BACKGROUNDS[department ?? 'all'] ?? BACKGROUNDS.all;

  return (
    <div className="relative rounded-2xl overflow-hidden mb-8 h-64 md:h-80">
      {/* Background images (stacked, crossfade) */}
      {Object.entries(BACKGROUNDS).map(([key, url]) => (
        <div
          key={key}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{
            backgroundImage: `url(${url})`,
            opacity: bg === url ? 1 : 0,
          }}
        />
      ))}

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center text-center px-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Give fashion a second life 🌱
        </h1>
        <p className="text-gray-100 text-lg mb-6 max-w-xl">
          Buy and sell pre-loved clothing, accessories, and more.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="#browse"
            className="bg-white text-teal-600 px-6 py-3 rounded-full font-medium hover:bg-teal-50 transition-colors"
          >
            Browse items
          </a>
          <Link
            to={user ? ROUTES.sell : ROUTES.login}
            className="bg-white/20 backdrop-blur text-white px-6 py-3 rounded-full font-medium hover:bg-white/30 transition-colors border border-white/40"
          >
            Sell an item 🏷️
          </Link>
        </div>
      </div>
    </div>
  );
}
