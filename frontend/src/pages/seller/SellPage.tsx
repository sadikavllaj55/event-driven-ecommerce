import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productApi } from '../../api/products';
import { useAuth } from '../../auth/AuthContext';
import { ImageUploadError, useImageUpload } from '../../hooks/useImageUpload';
import { invalidateListingQueries } from '../../api/queryKeys';
import { ROUTES } from '../../constants/routes';
import ProductForm from '../../components/ProductForm';
import type { CreateProductInput } from '../../types';

export default function SellPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { uploadImages } = useImageUpload();
  const [pendingPhotos, setPendingPhotos] = useState<{ id: string; files: File[] } | null>(null);
  const [retrying, setRetrying] = useState(false);

  if (!user) return <Navigate to={ROUTES.login} replace />;

  async function handleCreate(input: CreateProductInput, newImages: File[]) {
    // 1. Create the product, 2. upload its photos
    const product = await productApi.create(input);
    await finishPhotos(product.id, newImages);
  }

  async function finishPhotos(id: string, files: File[]) {
    setRetrying(true);
    try {
      await uploadImages(`/products/${id}/images`, files);
      setPendingPhotos(null);
      toast.success('Listing created! 🎉');
      navigate(ROUTES.myProducts);
    } catch (error) {
      if (!(error instanceof ImageUploadError)) throw error;
      setPendingPhotos({ id, files: error.remainingFiles });
    } finally {
      setRetrying(false);
      void invalidateListingQueries(qc, user?.sub, id);
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Sell an item 🏷️</h1>
      {pendingPhotos ? <div role="alert">
        <p>Listing saved, but some photos failed to upload.</p>
        <button disabled={retrying} onClick={() => void finishPhotos(pendingPhotos.id, pendingPhotos.files)}>
          {retrying ? 'Uploading...' : 'Retry photos'}
        </button>
        <button onClick={() => navigate(ROUTES.myProducts)}>Continue to my listings</button>
      </div> : <ProductForm
        submitLabel="List item 🏷️"
        submittingLabel="Creating…"
        onSubmit={handleCreate}
      />}
    </div>
  );
}
