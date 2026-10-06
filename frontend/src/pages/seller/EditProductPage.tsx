import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productApi } from '../../api/products';
import { useAuth } from '../../auth/AuthContext';
import { useImageUpload } from '../../hooks/useImageUpload';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../utils/errors';
import ProductForm, {
  productToFormValues,
  type ExistingImage,
} from '../../components/ProductForm';
import type { CreateProductInput } from '../../types';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { uploadImages } = useImageUpload();

  // Same key as ProductDetailPage → shared cache
  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['product', id],
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
    qc.invalidateQueries({ queryKey: ['product', id] });
    qc.invalidateQueries({ queryKey: ['my-products'] });
    qc.invalidateQueries({ queryKey: ['products'] });
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
    await uploadImages(`/products/${product!.id}/images`, newImages);
    refreshCaches();
    toast.success('Listing updated ✅');
    navigate(ROUTES.myProducts);
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Edit listing ✏️</h1>
        <Link
          to={ROUTES.myProducts}
          className="text-sm text-teal-600 hover:underline"
        >
          ← My listings
        </Link>
      </div>

      <ProductForm
        key={product.id} // remount if we navigate to a different product
        initialValues={productToFormValues(product)}
        existingImages={product.images ?? []}
        onRemoveExistingImage={handleRemoveImage}
        submitLabel="Save changes"
        submittingLabel="Saving…"
        onSubmit={handleUpdate}
      />
    </div>
  );
}
