import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../api/categories';
import { queryKeys } from '../api/queryKeys';
import { CONDITIONS, GENDERS } from '../constants/product';
import type { ProductFormValues } from './productFormModel';

interface Props {
  form: ProductFormValues;
  onChange: (field: keyof ProductFormValues, value: string) => void;
}

export default function ProductFormFields({ form, onChange }: Props) {
  const { data: categories } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: categoryApi.list,
  });

  return (
    <>
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
            onChange={(event) => onChange('price', event.target.value)}
            className={inputClass}
            placeholder="25.00"
          />
        </Field>
        <Field label="Stock">
          <input
            type="number"
            value={form.stock}
            onChange={(event) => onChange('stock', event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
        <Field label="Condition">
          <select
            value={form.condition}
            onChange={(event) => onChange('condition', event.target.value)}
            className={inputClass}
          >
            {CONDITIONS.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Department">
          <select
            value={form.gender}
            onChange={(event) => onChange('gender', event.target.value)}
            className={inputClass}
          >
            {GENDERS.map((gender) => (
              <option key={gender.value} value={gender.value}>
                {gender.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Category">
        <select
          value={form.category_id}
          onChange={(event) => onChange('category_id', event.target.value)}
          className={inputClass}
        >
          <option value="">Select a category</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>
    </>
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
