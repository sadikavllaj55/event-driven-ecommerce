import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productApi } from '../../api/products';
import { invalidateListingQueries, queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { ImageUploadError, useImageUpload } from '../../hooks/useImageUpload';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../utils/errors';
import ProductForm from '../../components/ProductForm';
import {
  productToFormValues,
  type ExistingImage,
} from '../../components/productFormModel';
import type { CreateProductInput } from '../../types';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { uploadImages } = useImageUpload();
  const [pendingPhotos, setPendingPhotos] = useState<File[] | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Same key as ProductDetailPage → shared cache
  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => productApi.getById(id!),
    enabled: !!id,
  });

  if (!user) return <Navigate to={ROUTES.login} replace />;
  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (isError || !product)
    return <p className="text-red-500">Product not found.</p>;

  // UX guard only — the backend enforces ownership on every write
  if (product.seller_id !== user.sub) {
    return <p className="text-red-500">You can only edit your own listings.</p>;
  }

  function refreshCaches() {
    void invalidateListingQueries(qc, user?.sub, id);
  }

  async function handleRemoveImage(image: ExistingImage) {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await productApi.deleteImage(product!.id, image.id);
      refreshCaches(); // product refetches → image disappears from the uploader
      toast.success('Photo deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete photo'));
    }
  }

  async function handleUpdate(input: CreateProductInput, newImages: File[]) {
    await productApi.update(product!.id, input);
    await finishPhotos(newImages);
  }

  async function finishPhotos(files: File[]) {
    setRetrying(true);
    try {
      await uploadImages(`/products/${product!.id}/images`, files);
      setPendingPhotos(null);
      toast.success('Listing updated ✅');
      navigate(ROUTES.myProducts);
    } catch (error) {
      if (!(error instanceof ImageUploadError)) throw error;
      setPendingPhotos(error.remainingFiles);
    } finally {
      setRetrying(false);
      refreshCaches();
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-lg bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Edit listing ✏️</h1>
        <Link
          to={ROUTES.myProducts}
          className="text-sm text-teal-600 hover:underline"
        >
          ← My listings
        </Link>
      </div>

      {pendingPhotos ? (
        <div role="alert">
          <p>Changes saved, but some photos failed to upload.</p>
          <button
            disabled={retrying}
            onClick={() => void finishPhotos(pendingPhotos)}
          >
            {retrying ? 'Uploading...' : 'Retry photos'}
          </button>
          <button onClick={() => navigate(ROUTES.myProducts)}>
            Continue to my listings
          </button>
        </div>
      ) : (
        <ProductForm
          key={product.id} // remount if we navigate to a different product
          initialValues={productToFormValues(product)}
          existingImages={product.images ?? []}
          onRemoveExistingImage={handleRemoveImage}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
