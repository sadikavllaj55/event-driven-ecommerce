import type { ProductFormValues } from './productFormModel';
import ProductBasicsFields from './ProductBasicsFields';
import ProductListingFields from './ProductListingFields';

interface Props {
  form: ProductFormValues;
  onChange: (field: keyof ProductFormValues, value: string) => void;
}

export default function ProductFormFields({ form, onChange }: Props) {
  return (
    <div className="space-y-6">
      <ProductBasicsFields form={form} onChange={onChange} />
      <ProductListingFields form={form} onChange={onChange} />
    </div>
  );
}
