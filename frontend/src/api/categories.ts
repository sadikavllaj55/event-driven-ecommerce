import { api } from './client';
import type { Category } from '../types';

export const categoryApi = {
  // Public — full nested tree
  list: async (): Promise<Category[]> => {
    const res = await api.get<Category[]>('/categories');
    return res.data;
  },

  // Admin — create (parentId null = top-level)
  create: async (name: string, parentId: string | null): Promise<Category> => {
    const res = await api.post<Category>('/admin/categories', {
      name,
      parent_id: parentId,
    });
    return res.data;
  },

  // Admin — rename/move (must send parent_id, or the category moves to the root!)
  update: async (
    id: string,
    name: string,
    parentId: string | null,
  ): Promise<Category> => {
    const res = await api.put<Category>(`/admin/categories/${id}`, {
      name,
      parent_id: parentId,
    });
    return res.data;
  },

  // Admin — delete (backend returns 409 if it has children)
  remove: async (id: string): Promise<void> => {
    await api.delete(`/admin/categories/${id}`);
  },
};
