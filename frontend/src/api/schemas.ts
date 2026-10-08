import { z } from 'zod';

export const roleSchema = z.enum(['buyer', 'seller', 'admin']);
export const orderStatusSchema = z.enum([
  'pending',
  'stock_reserved',
  'paid',
  'failed',
  'payment_failed',
]);
export const conditionSchema = z.enum([
  'new_with_tags',
  'new_without_tags',
  'very_good',
  'good',
  'satisfactory',
]);
export const authClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  role: roleSchema,
  exp: z.number().optional(),
});
export const loginResponseSchema = z.object({ token: z.string().min(1) });
export const productSchema = z.object({
  id: z.string().min(1),
  seller_id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  price_cents: z.number().int().nonnegative(),
  price: z.string(),
  stock: z.number().int().nonnegative(),
  gender: z.string(),
  brand: z.string(),
  model_code: z.string(),
  condition: conditionSchema,
  material: z.string(),
  color: z.string(),
  size: z.string(),
  status: z.string(),
  image_url: z.string(),
  category_id: z.string().nullable(),
  images: z
    .array(
      z.object({
        id: z.string(),
        image_url: z.string(),
        position: z.number().int(),
      }),
    )
    .nullable()
    .transform((images) => images ?? []),
  created_at: z.iso.datetime({ offset: true }),
});
export const productSearchResultSchema = z
  .object({
    id: z.string().min(1),
    seller_id: z.string().min(1),
    name: z.string(),
    price_cents: z.number().int().nonnegative(),
    gender: z.string(),
    brand: z.string().optional(),
    size: z.string().optional(),
    condition: conditionSchema.optional(),
    image_url: z.string().optional(),
  })
  .transform((hit) => ({
    id: hit.id,
    name: hit.name,
    price: (hit.price_cents / 100).toFixed(2),
    brand: hit.brand ?? '',
    size: hit.size ?? '',
    condition: hit.condition,
    image_url: hit.image_url ?? '',
    images: [],
  }));
export const pagedProductsSchema = z.object({
  products: productSchema
    .array()
    .nullable()
    .transform((products) => products ?? []),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});
export const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  avatar_url: z.string(),
  bio: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});
export const cartSchema = z.object({
  buyer_id: z.string(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.number().int().positive(),
        price_cents: z.number().int().nonnegative(),
      }),
    )
    .nullable()
    .transform((items) => items ?? []),
});
export const orderSchema = z.object({
  id: z.string().min(1),
  buyer_id: z.string().min(1),
  status: orderStatusSchema,
  total_cents: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      product_id: z.string().min(1),
      quantity: z.number().int().positive(),
      price_cents: z.number().int().nonnegative(),
      status: z.string().optional(),
    }),
  ),
  created_at: z.iso.datetime({ offset: true }),
});
