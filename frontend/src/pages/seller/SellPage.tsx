import { Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productApi } from '../../api/products';
import { useAuth } from '../../auth/AuthContext';
import { useImageUpload } from '../../hooks/useImageUpload';
import { ROUTES } from '../../constants/routes';
import ProductForm from '../../components/ProductForm';
import type { CreateProductInput } from '../../types';

export default function SellPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { uploadImages } = useImageUpload();

  if (!user) return <Navigate to={ROUTES.login} replace />;

  async function handleCreate(input: CreateProductInput, newImages: File[]) {
    // 1. Create the product, 2. upload its photos
    const product = await productApi.create(input);
    await uploadImages(`/products/${product.id}/images`, newImages);

    // New listing should appear in My Listings + browse without a refresh
    qc.invalidateQueries({ queryKey: ['my-products'] });
    qc.invalidateQueries({ queryKey: ['products'] });

    toast.success('Listing created! 🎉');
    navigate(ROUTES.myProducts);
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Sell an item 🏷️</h1>
      <ProductForm
        submitLabel="List item 🏷️"
        submittingLabel="Creating…"
        onSubmit={handleCreate}
      />
    </div>
  );
}
