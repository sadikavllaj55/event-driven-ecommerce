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
    <section className="relative mb-8 min-h-[22rem] overflow-hidden rounded-[1.75rem] bg-[var(--market-ink)] shadow-xl shadow-[var(--market-ink)]/10 sm:min-h-[25rem]">
      {Object.entries(BACKGROUNDS).map(([key, url]) => (
        <div
        key={key}
        aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{
            backgroundImage: `url(${url})`,
            opacity: bg === url ? 1 : 0,
          }}
        />
      ))}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#102e27]/95 via-[#173d33]/75 to-[#173d33]/15"
      />
      <div className="relative flex min-h-[22rem] items-center px-6 py-10 sm:min-h-[25rem] sm:px-12 lg:px-16">
        <div className="max-w-2xl">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
          <span aria-hidden="true" className="text-emerald-300">✳</span>
          The circular wardrobe
        </p>
        <h1 className="mb-4 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Give fashion
          <br />
          a second life.
        </h1>
        <p className="mb-7 max-w-lg text-base leading-7 text-white/80 sm:text-lg">
          Find pre-loved pieces worth keeping — and pass along the ones you
          no longer wear.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#browse"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--market-ink)] shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            Browse items
            <span aria-hidden="true">→</span>
          </a>
          <Link
            to={user ? ROUTES.sell : ROUTES.login}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
          >
            Sell an item
          </Link>
        </div>
        </div>
      </div>
    </section>
  );
}
