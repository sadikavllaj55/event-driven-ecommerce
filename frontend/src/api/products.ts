import { api } from './client';
import type { PagedProducts, Product, CreateProductInput } from '../types';

export const productApi = {
  // Browse (paginated)
  list: async (page: number, limit: number): Promise<PagedProducts> => {
    const res = await api.get<PagedProducts>('/products', {
      params: { page, limit },
    });
    return res.data;
  },

  // Search (Elasticsearch)
  search: async (
    query: string,
    category?: string,
    gender?: string,
  ): Promise<Product[]> => {
    const res = await api.get<Product[]>('/products/search', {
      params: { q: query, category, gender },
    });
    return res.data;
  },

  // Single product
  getById: async (id: string): Promise<Product> => {
    const res = await api.get<Product>(`/products/${id}`);
    return res.data;
  },

  // Seller's own listings
  listMine: async (page: number, limit: number): Promise<PagedProducts> => {
    const res = await api.get<PagedProducts>('/products/mine', {
      params: { page, limit },
    });
    return res.data;
  },

  // Create a listing
  create: async (input: CreateProductInput): Promise<Product> => {
    const res = await api.post<Product>('/products', input);
    return res.data;
  },
  // Update a listing (send ALL fields — the backend overwrites every column)
  update: async (id: string, input: CreateProductInput): Promise<Product> => {
    const res = await api.put<Product>(`/products/${id}`, input);
    return res.data;
  },

  // Delete one image from a listing
  deleteImage: async (productId: string, imageId: string): Promise<void> => {
    await api.delete(`/products/${productId}/images/${imageId}`);
  },

  // Change status (active/inactive)
  setStatus: async (id: string, status: string): Promise<void> => {
    await api.patch(`/products/${id}/status`, { status });
  },

  // Soft delete
  remove: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  // Upload an image to a product
  uploadImage: async (productId: string, file: File): Promise<void> => {
    const fd = new FormData();
    fd.append('image', file);
    await api.post(`/products/${productId}/images`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
