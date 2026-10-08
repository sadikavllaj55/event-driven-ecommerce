import { useState } from 'react';
import { CONDITION_COLORS, CONDITION_LABELS } from '../constants/product';
import type { Product, ProductImage } from '../types';

interface Props {
  product: Product;
  images: ProductImage[];
}

export default function ProductGallery({ product, images }: Props) {
  const [activeImage, setActiveImage] = useState(0);
  const mainImage = images[activeImage]?.image_url;
  const conditionColor =
    CONDITION_COLORS[product.condition] ?? 'bg-gray-100 text-gray-700';
  const conditionLabel =
    CONDITION_LABELS[product.condition] ?? product.condition;

  return (
    <section aria-label="Product gallery" className="min-w-0">
      <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--market-border)] bg-[#e8f0ec] sm:aspect-square">
        {mainImage ? (
          <img
            src={mainImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl text-[var(--market-primary)]/35">
            <span aria-hidden="true">◇</span>
          </div>
        )}
        <span
          className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${conditionColor}`}
        >
          {conditionLabel}
        </span>
        {images.length > 1 && (
          <span className="absolute bottom-4 right-4 rounded-full bg-[var(--market-ink)]/85 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
            {activeImage + 1} / {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div
          aria-label="Choose product photo"
          className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-2"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`View photo ${index + 1}`}
              aria-pressed={index === activeImage}
              onClick={() => setActiveImage(index)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--market-primary)]/30 sm:h-20 sm:w-20 ${
                index === activeImage
                  ? 'border-[var(--market-primary)]'
                  : 'border-transparent hover:border-[var(--market-border)]'
              }`}
            >
              <img
                src={image.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
