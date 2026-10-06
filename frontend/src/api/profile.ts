import { api } from './client';
import type { PagedProducts, Profile } from '../types';

export const profileApi = {
  // Public profile (no auth needed)
  get: async (userId: string): Promise<Profile> => {
    const res = await api.get<Profile>(`/users/${userId}/profile`);
    return res.data;
  },

  // Current user's bio
  updateBio: async (bio: string): Promise<Profile> => {
    const res = await api.put<Profile>('/profile', { bio });
    return res.data;
  },

  // Current user's avatar (same "image" field name as product uploads)
  uploadAvatar: async (file: File): Promise<Profile> => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await api.post<Profile>('/profile/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // A seller's ACTIVE products (public shop)
  sellerProducts: async (
    sellerId: string,
    page: number,
    limit: number,
  ): Promise<PagedProducts> => {
    const res = await api.get<PagedProducts>(`/sellers/${sellerId}/products`, {
      params: { page, limit },
    });
    return res.data;
  },
};
