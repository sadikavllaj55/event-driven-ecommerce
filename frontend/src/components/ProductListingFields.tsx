import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../api/categories';
import { queryKeys } from '../api/queryKeys';
import { CONDITIONS, GENDERS } from '../constants/product';
import type { ProductFormValues } from './productFormModel';

interface Props {
  form: ProductFormValues;
  onChange: (field: keyof ProductFormValues, value: string) => void;
}

export default function ProductListingFields({ form, onChange }: Props) {
  const { data: categories } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: categoryApi.list,
  });

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">
        Listing details
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField
          label="Condition"
          value={form.condition}
          onChange={(value) => onChange('condition', value)}
          placeholder="Select a condition"
          options={CONDITIONS}
        />
        <SelectField
          label="Department"
          value={form.gender}
          onChange={(value) => onChange('gender', value)}
          placeholder="Select a department"
          options={GENDERS}
        />
        <SelectField
          label="Category"
          value={form.category_id}
          onChange={(value) => onChange('category_id', value)}
          placeholder="Select a category"
          options={(categories ?? []).map(({ id, name }) => ({
            value: id,
            label: name,
          }))}
        />
      </div>
    </section>
  );
}

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: readonly { value: string; label: string; icon?: string }[];
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <Listbox value={value} onChange={onChange}>
      {({ open }) => (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-600">
            {label}
          </label>
          <ListboxButton className="group flex h-12 w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm font-medium text-gray-800 shadow-sm transition-colors hover:border-gray-300 focus:outline-none focus-visible:border-teal-500 focus-visible:ring-4 focus-visible:ring-teal-500/10">
            <span
              className={`flex min-w-0 items-center gap-2 ${value ? '' : 'text-gray-500'}`}
            >
              {selected?.icon && (
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center"
                >
                  {selected.icon}
                </span>
              )}
              <span className="truncate">{selected?.label ?? placeholder}</span>
            </span>
            <span
              aria-hidden="true"
              className={`block h-2 w-2 translate-y-[-2px] rotate-45 border-b-2 border-r-2 border-gray-400 transition-transform duration-150 ${open ? 'rotate-[225deg]' : ''}`}
            />
          </ListboxButton>
          <ListboxOptions
            anchor="bottom"
            transition
            className="z-50 w-[var(--button-width)] origin-top rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg outline-none transition duration-150 ease-out data-[closed]:-translate-y-1 data-[closed]:scale-[.98] data-[closed]:opacity-0 motion-reduce:transition-none"
          >
            {options.map((option) => (
              <ListboxOption
                key={option.value}
                value={option.value}
                className="group flex min-h-10 cursor-pointer select-none items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-gray-700 outline-none data-[focus]:bg-teal-50 data-[focus]:text-teal-900 data-[selected]:font-semibold data-[selected]:text-teal-700"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {option.icon && (
                    <span
                      aria-hidden="true"
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center"
                    >
                      {option.icon}
                    </span>
                  )}
                  <span>{option.label}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="hidden text-teal-600 group-data-[selected]:block"
                >
                  ✓
                </span>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      )}
    </Listbox>
  );
}
