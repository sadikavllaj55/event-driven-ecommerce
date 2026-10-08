import type { Product } from '../types';

export interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  original_price: string;
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
  original_price: '',
  stock: '1',
  brand: '',
  size: '',
  color: '',
  material: '',
  condition: 'good',
  gender: 'unisex',
  category_id: '',
};

export function productToFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    description: product.description ?? '',
    price: (product.price_cents / 100).toFixed(2),
    original_price:
      product.original_price_cents == null
        ? ''
        : (product.original_price_cents / 100).toFixed(2),
    stock: String(product.stock),
    brand: product.brand ?? '',
    size: product.size ?? '',
    color: product.color ?? '',
    material: product.material ?? '',
    condition: product.condition,
    gender: product.gender,
    category_id: product.category_id ?? '',
  };
}
