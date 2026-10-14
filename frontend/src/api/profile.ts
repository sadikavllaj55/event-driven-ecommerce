import { api } from './client';
import type {
  AccountProfile,
  PagedProducts,
  Profile,
  ProfileUpdate,
} from '../types';
import {
  accountProfileSchema,
  pagedProductsSchema,
  profileSchema,
} from './schemas';

export const profileApi = {
  me: async (signal?: AbortSignal): Promise<AccountProfile> => {
    const res = await api.get('/profile', { signal });
    return accountProfileSchema.parse(res.data);
  },

  update: async (update: ProfileUpdate): Promise<AccountProfile> => {
    const res = await api.put('/profile', update);
    return accountProfileSchema.parse(res.data);
  },

  search: async (query: string): Promise<Profile[]> => {
    const res = await api.get('/users/search', { params: { q: query } });
    return profileSchema.array().parse(res.data);
  },

  // Public profile (no auth needed)
  get: async (userId: string): Promise<Profile> => {
    const res = await api.get<Profile>(`/users/${userId}/profile`);
    return profileSchema.parse(res.data);
  },

  // Current user's bio
  updateBio: async (bio: string): Promise<Profile> => {
    const res = await api.put<Profile>('/profile', { bio });
    return profileSchema.parse(res.data);
  },

  // Current user's avatar (same "image" field name as product uploads)
  uploadAvatar: async (file: File): Promise<Profile> => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await api.post<Profile>('/profile/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return profileSchema.parse(res.data);
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
    return pagedProductsSchema.parse(res.data);
  },
};
