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
  condition: string;
  material: string;
  color: string;
  size: string;
  status: string;
  image_url: string;
  images: ProductImage[];
  created_at: string;
}

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
  condition: string;
  gender: string;
  category_id?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  children: Category[];
}
