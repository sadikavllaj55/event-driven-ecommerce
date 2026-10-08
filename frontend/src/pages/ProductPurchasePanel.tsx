import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import FavoriteButton from '../components/FavoriteButton';
import ProductPrice from '../components/ProductPrice';
import { ROUTES } from '../constants/routes';
import type { Product, Profile } from '../types';

interface Props {
  product: Product;
  sellerProfile?: Profile;
  isAddingToCart: boolean;
  onAddToCart: () => void;
}

export default function ProductPurchasePanel({
  product,
  sellerProfile,
  isAddingToCart,
  onAddToCart,
}: Props) {
  const isOutOfStock = product.stock < 1;
  const attributes = (
    [
      ['Brand', product.brand],
      ['Size', product.size],
      ['Color', product.color],
      ['Material', product.material],
      ['Model', product.model_code],
    ] satisfies [string, string][]
  ).filter(([, value]) => Boolean(value));

  return (
    <section className="min-w-0 lg:py-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--market-primary)]">
            Pre-loved · {product.gender}
          </p>
          <h1 className="break-words text-3xl font-semibold leading-tight text-[var(--market-ink)] sm:text-4xl">
            {product.name}
          </h1>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--market-border)] bg-white shadow-sm transition-transform hover:scale-105">
          <FavoriteButton productId={product.id} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--market-border)] pb-5">
        <ProductPrice
          price={product.price}
          originalPrice={product.original_price}
          size="detail"
        />
        <span
          className={`text-sm font-medium ${isOutOfStock ? 'text-gray-500' : 'text-[var(--market-primary)]'}`}
        >
          {isOutOfStock ? 'Out of stock' : `${product.stock} available`}
        </span>
      </div>

      {attributes.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-b border-[var(--market-border)] pb-6 sm:gap-x-8">
          {attributes.map(([label, value]) => (
            <Attribute key={label} label={label} value={value} />
          ))}
        </dl>
      )}

      {product.description && (
        <section className="py-6">
          <h2 className="mb-2 text-sm font-semibold text-[var(--market-ink)]">
            About this item
          </h2>
          <p className="whitespace-pre-line text-sm leading-6 text-gray-600">
            {product.description}
          </p>
        </section>
      )}

      <Link
        to={ROUTES.seller(product.seller_id)}
        className="flex items-center gap-3 border-y border-[var(--market-border)] py-4 transition-colors hover:text-[var(--market-primary)]"
      >
        <Avatar
          url={sellerProfile?.avatar_url || undefined}
          name={sellerProfile?.name || 'Seller'}
          size="sm"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[var(--market-ink)]">
            {sellerProfile?.name ?? 'Marketplace seller'}
          </span>
        </span>
        <span aria-hidden="true" className="text-lg text-gray-400">
          →
        </span>
      </Link>

      <button
        onClick={onAddToCart}
        disabled={isAddingToCart || isOutOfStock}
        className="mt-6 h-12 w-full rounded-lg bg-[var(--market-primary)] px-5 text-sm font-semibold text-white shadow-sm transition duration-150 hover:bg-[var(--market-primary-hover)] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/20 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none motion-reduce:transition-none"
      >
        {isOutOfStock
          ? 'Out of stock'
          : isAddingToCart
            ? 'Adding to cart…'
            : 'Add to cart'}
      </button>
    </section>
  );
}

function Attribute({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium capitalize text-gray-800">
        {value}
      </dd>
    </div>
  );
}
