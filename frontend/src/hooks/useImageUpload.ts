import { api } from '../api/client';

export class ImageUploadError extends Error {
  remainingFiles: File[];

  constructor(remainingFiles: File[], cause: unknown) {
    super('Some photos could not be uploaded', { cause });
    this.remainingFiles = remainingFiles;
  }
}

// Reusable image upload helper — uploads files to any endpoint.
// Used for product images, profile pictures, etc.
export function useImageUpload() {
  async function uploadImages(endpoint: string, files: File[]): Promise<void> {
    for (const [index, file] of files.entries()) {
      const fd = new FormData();
      fd.append('image', file);
      try {
        await api.post(endpoint, fd);
      } catch (error) {
        throw new ImageUploadError(files.slice(index), error);
      }
    }
  }

  return { uploadImages };
}
