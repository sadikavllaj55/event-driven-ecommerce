import { useId } from 'react';
import type { ProductFormValues } from './productFormModel';

interface Props {
  form: ProductFormValues;
  onChange: (field: keyof ProductFormValues, value: string) => void;
}

export default function ProductBasicsFields({ form, onChange }: Props) {
  const stockInputId = useId();
  const parsedStock = Number.parseInt(form.stock, 10);
  const stockValue = Number.isNaN(parsedStock) ? 1 : Math.max(1, parsedStock);

  return (
    <>
      <fieldset className="min-w-0 space-y-4">
        <legend className="mb-1 w-full border-b border-gray-100 pb-2 text-sm font-semibold text-gray-900">
          Item information
        </legend>
        <Field label="Title *">
          <input
            value={form.name}
            onChange={(event) => onChange('name', event.target.value)}
            className={inputClass}
            placeholder="e.g. Blue Zara Hoodie"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(event) => onChange('description', event.target.value)}
            className={`${inputClass} min-h-24 resize-y py-3`}
            rows={3}
            placeholder="What makes this item special?"
          />
        </Field>
      </fieldset>

      <fieldset className="min-w-0 space-y-4">
        <legend className="mb-1 w-full border-b border-gray-100 pb-2 text-sm font-semibold text-gray-900">
          Price and attributes
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Sale price (€) *">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => onChange('price', event.target.value)}
              className={inputClass}
              placeholder="25.00"
            />
          </Field>
          <Field label="Original price (€) (optional)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.original_price}
              onChange={(event) =>
                onChange('original_price', event.target.value)
              }
              className={inputClass}
              placeholder="e.g. 49.00"
            />
          </Field>
          <div className="min-w-0">
            <label
              htmlFor={stockInputId}
              className="mb-1.5 block text-xs font-semibold text-gray-600"
            >
              Stock
            </label>
            <div className="flex h-12 items-center rounded-lg border border-gray-200 bg-white shadow-sm transition duration-150 hover:border-gray-300 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10">
              <button
                type="button"
                aria-label="Decrease stock"
                aria-controls={stockInputId}
                disabled={stockValue === 1}
                onClick={() =>
                  onChange('stock', String(Math.max(1, stockValue - 1)))
                }
                className="flex h-full w-12 shrink-0 items-center justify-center rounded-l-lg text-lg font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none"
              >
                -
              </button>
              <input
                id={stockInputId}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.stock}
                onChange={(event) => onChange('stock', event.target.value)}
                className="h-full w-full min-w-0 border-0 bg-transparent px-1 text-center text-sm font-semibold text-gray-900 outline-none [appearance:textfield] focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                aria-label="Increase stock"
                aria-controls={stockInputId}
                onClick={() => onChange('stock', String(stockValue + 1))}
                className="flex h-full w-12 shrink-0 items-center justify-center rounded-r-lg text-lg font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 motion-reduce:transition-none"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Brand">
            <input
              value={form.brand}
              onChange={(event) => onChange('brand', event.target.value)}
              className={inputClass}
              placeholder="Zara"
            />
          </Field>
          <Field label="Size">
            <input
              value={form.size}
              onChange={(event) => onChange('size', event.target.value)}
              className={inputClass}
              placeholder="M"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Color">
            <input
              value={form.color}
              onChange={(event) => onChange('color', event.target.value)}
              className={inputClass}
              placeholder="Blue"
            />
          </Field>
          <Field label="Material">
            <input
              value={form.material}
              onChange={(event) => onChange('material', event.target.value)}
              className={inputClass}
              placeholder="Cotton"
            />
          </Field>
        </div>
      </fieldset>
    </>
  );
}

const inputClass =
  'block h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition duration-150 placeholder:text-gray-400 hover:border-gray-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">
        {label}
      </span>
      {children}
    </label>
  );
}
