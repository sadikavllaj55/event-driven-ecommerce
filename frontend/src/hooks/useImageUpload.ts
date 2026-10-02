import { api } from '../api/client';

// Reusable image upload helper — uploads files to any endpoint.
// Used for product images, profile pictures, etc.
export function useImageUpload() {
  async function uploadImages(endpoint: string, files: File[]): Promise<void> {
    for (const file of files) {
      const fd = new FormData();
      fd.append('image', file);
      await api.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
  }

  return { uploadImages };
}
