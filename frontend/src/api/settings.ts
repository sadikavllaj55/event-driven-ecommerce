import { api } from './client';

export interface PublicSettings {
  max_images_per_product: number;
}

export const settingsApi = {
  getPublic: async (): Promise<PublicSettings> => {
    const res = await api.get<PublicSettings>('/settings/public');
    return res.data;
  },
};
