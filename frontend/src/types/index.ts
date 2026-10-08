import type { z } from 'zod';
import type {
  roleSchema,
  orderStatusSchema,
  conditionSchema,
  productSearchResultSchema,
} from '../api/schemas';

export type Role = z.infer<typeof roleSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type ProductCondition = z.infer<typeof conditionSchema>;
export type ProductSearchResult = z.infer<typeof productSearchResultSchema>;

export interface ProductImage {
  id: string;
  image_url: string;
  position: number;
}

export interface Product {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  price_cents: number;
  price: string;
  stock: number;
  gender: string;
  brand: string;
  model_code: string;
  condition: ProductCondition;
  material: string;
  color: string;
  size: string;
  status: string;
  image_url: string;
  images: ProductImage[];
  category_id: string | null;
  created_at: string;
}

export type ProductCardData = Pick<
  Product,
  'id' | 'name' | 'price' | 'brand' | 'size' | 'image_url'
> & {
  condition?: ProductCondition;
  images?: ProductImage[] | null;
};

export interface PagedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  brand: string;
  size: string;
  color: string;
  material: string;
  condition: ProductCondition;
  gender: string;
  category_id?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  children?: Category[];
}

// Cart
export interface CartItem {
  product_id: string;
  quantity: number;
  price_cents: number;
}

export interface Cart {
  buyer_id: string;
  items: CartItem[];
}

// Order
export interface OrderItem {
  product_id: string;
  quantity: number;
  price_cents: number;
  status?: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  status: OrderStatus;
  total_cents: number;
  items: OrderItem[];
  created_at: string;
}

// Public seller profile (never contains email/role)
export interface Profile {
  id: string;
  name: string;
  avatar_url: string;
  bio: string;
  created_at: string;
}
