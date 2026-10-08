import { useState } from 'react';
import toast from 'react-hot-toast';
import ImageUploader from './ImageUploader';
import ProductFormFields from './ProductFormFields';
import {
  EMPTY_PRODUCT_FORM,
  type ExistingImage,
  type ProductFormValues,
} from './productFormModel';
import { usePublicSettings } from '../hooks/usePublicSettings';
import { getErrorMessage } from '../utils/errors';
import { conditionSchema } from '../api/schemas';
import type { CreateProductInput } from '../types';

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
          condition: conditionSchema.parse(form.condition),
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
      <ProductFormFields form={form} onChange={update} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Photos
        </label>
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
      </div>

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
