type PriceSize = 'card' | 'seller' | 'detail' | 'cart';

const sizes: Record<
  PriceSize,
  { sale: string; original: string; badge: string }
> = {
  card: {
    sale: 'text-base font-bold',
    original: 'text-xs',
    badge: 'text-[10px]',
  },
  seller: {
    sale: 'text-sm font-semibold',
    original: 'text-xs',
    badge: 'text-[10px]',
  },
  detail: {
    sale: 'text-3xl font-semibold sm:text-4xl',
    original: 'text-sm sm:text-base',
    badge: 'text-xs',
  },
  cart: {
    sale: 'text-sm font-semibold',
    original: 'text-xs',
    badge: 'text-[10px]',
  },
};

export default function ProductPrice({
  price,
  originalPrice,
  size = 'card',
}: {
  price: string;
  originalPrice?: string | null;
  size?: PriceSize;
}) {
  const saleCents = Math.round(Number(price) * 100);
  const originalCents = Number(originalPrice) * 100;
  const hasDiscount =
    originalPrice != null &&
    Number.isFinite(saleCents) &&
    Number.isFinite(originalCents) &&
    Math.round(originalCents) > saleCents;
  const discountPercent = hasDiscount
    ? Math.round(
        ((Math.round(originalCents) - saleCents) / Math.round(originalCents)) *
          100,
      )
    : 0;
  const style = sizes[size];

  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`${style.sale} tabular-nums text-[var(--market-ink)]`}>
        <span className="sr-only">Sale price </span>€{price}
      </span>
      {hasDiscount && (
        <>
          <span
            className={`${style.original} tabular-nums text-red-600 line-through decoration-red-500/80`}
          >
            <span className="sr-only">Original price </span>€{originalPrice}
          </span>
          <span
            className={`${style.badge} rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700`}
          >
            -{discountPercent}%
          </span>
        </>
      )}
    </div>
  );
}
