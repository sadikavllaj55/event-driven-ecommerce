import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { categoryApi } from '../api/categories';
import ImageUploader from './ImageUploader';
import { usePublicSettings } from '../hooks/usePublicSettings';
import { CONDITIONS, GENDERS } from '../constants/product';
import { getErrorMessage } from '../utils/errors';
import type { CreateProductInput, Product } from '../types';

// Form state uses strings (inputs always give strings); converted on submit
export interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  stock: string;
  brand: string;
  size: string;
  color: string;
  material: string;
  condition: string;
  gender: string;
  category_id: string;
}

export interface ExistingImage {
  id: string;
  image_url: string;
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: '',
  description: '',
  price: '',
  stock: '1',
  brand: '',
  size: '',
  color: '',
  material: '',
  condition: 'good',
  gender: 'unisex',
  category_id: '',
};

// Converts an API product into form values (used by the Edit page)
export function productToFormValues(p: Product): ProductFormValues {
  return {
    name: p.name,
    description: p.description ?? '',
    price: (p.price_cents / 100).toFixed(2),
    stock: String(p.stock),
    brand: p.brand ?? '',
    size: p.size ?? '',
    color: p.color ?? '',
    material: p.material ?? '',
    condition: p.condition,
    gender: p.gender,
    category_id: p.category_id ?? '',
  };
}

interface Props {
  initialValues?: ProductFormValues;
  existingImages?: ExistingImage[];
  onRemoveExistingImage?: (image: ExistingImage) => void;
  submitLabel: string;
  submittingLabel: string;
  // The page decides what to do (create or update). Throw on failure.
  onSubmit: (input: CreateProductInput, newImages: File[]) => Promise<void>;
}

export default function ProductForm({
  initialValues = EMPTY_PRODUCT_FORM,
  existingImages = [],
  onRemoveExistingImage,
  submitLabel,
  submittingLabel,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<ProductFormValues>(initialValues);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { maxImages } = usePublicSettings();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
  });

  function update(field: keyof ProductFormValues, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      toast.error('Name and price are required');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        {
          name: form.name.trim(),
          description: form.description,
          price: parseFloat(form.price),
          stock: parseInt(form.stock) || 1,
          brand: form.brand,
          size: form.size,
          color: form.color,
          material: form.material,
          condition: form.condition,
          gender: form.gender,
          category_id: form.category_id || null,
        },
        newImages,
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Something went wrong'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Title *">
        <input
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className={inputClass}
          placeholder="e.g. Blue Zara Hoodie"
        />
      </Field>

      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          className={inputClass}
          rows={3}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Price (€) *">
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            className={inputClass}
            placeholder="25.00"
          />
        </Field>
        <Field label="Stock">
          <input
            type="number"
            value={form.stock}
            onChange={(e) => update('stock', e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Brand">
          <input
            value={form.brand}
            onChange={(e) => update('brand', e.target.value)}
            className={inputClass}
            placeholder="Zara"
          />
        </Field>
        <Field label="Size">
          <input
            value={form.size}
            onChange={(e) => update('size', e.target.value)}
            className={inputClass}
            placeholder="M"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Color">
          <input
            value={form.color}
            onChange={(e) => update('color', e.target.value)}
            className={inputClass}
            placeholder="Blue"
          />
        </Field>
        <Field label="Material">
          <input
            value={form.material}
            onChange={(e) => update('material', e.target.value)}
            className={inputClass}
            placeholder="Cotton"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Condition">
          <select
            value={form.condition}
            onChange={(e) => update('condition', e.target.value)}
            className={inputClass}
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Department">
          <select
            value={form.gender}
            onChange={(e) => update('gender', e.target.value)}
            className={inputClass}
          >
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Category">
        <select
          value={form.category_id}
          onChange={(e) => update('category_id', e.target.value)}
          className={inputClass}
        >
          <option value="">Select a category</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Photos">
        <ImageUploader
          images={newImages}
          onChange={setNewImages}
          max={maxImages}
          existingUrls={existingImages.map((img) => img.image_url)}
          onRemoveExisting={
            onRemoveExistingImage
              ? (url) => {
                  const img = existingImages.find((i) => i.image_url === url);
                  if (img) onRemoveExistingImage(img);
                }
              : undefined
          }
        />
      </Field>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-teal-600 text-white py-3 rounded-full font-medium hover:bg-teal-700 disabled:opacity-50"
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}

const inputClass =
  'w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
