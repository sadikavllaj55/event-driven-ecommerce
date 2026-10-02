import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../constants/routes';
import type { Product } from '../../types';
import { useImageUpload } from '../../hooks/useImageUpload';
import ImageUploader from '../../components/ImageUploader';

const CONDITIONS = [
  { value: 'new_with_tags', label: 'New with tags' },
  { value: 'new_without_tags', label: 'New without tags' },
  { value: 'very_good', label: 'Very good' },
  { value: 'good', label: 'Good' },
  { value: 'satisfactory', label: 'Satisfactory' },
];

const GENDERS = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'kids', label: 'Kids' },
];
const { uploadImages } = useImageUpload();

export default function SellPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
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
  });
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    navigate(ROUTES.login);
    return null;
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.price) {
      toast.error('Name and price are required');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create the product
      const res = await api.post<Product>('/products', {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 1,
        brand: form.brand,
        size: form.size,
        color: form.color,
        material: form.material,
        condition: form.condition,
        gender: form.gender,
      });

      const productId = res.data.id;

      // 2. Upload images (if any)
      await uploadImages(`/products/${productId}/images`, images);

      toast.success('Listing created! 🎉');
      navigate(ROUTES.myProducts);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Sell an item 🏷️</h1>

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
          <Field label="Category">
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

        <Field label="Photos">
          <ImageUploader images={images} onChange={setImages} max={7} />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-teal-600 text-white py-3 rounded-full font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'List item 🏷️'}
        </button>
      </form>
    </div>
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
