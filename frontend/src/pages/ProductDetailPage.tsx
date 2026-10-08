import { queryKeys } from '../api/queryKeys';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/products';
import { profileApi } from '../api/profile';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../constants/routes';
import toast from 'react-hot-toast';
import ProductGallery from './ProductGallery';
import ProductPurchasePanel from './ProductPurchasePanel';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => productApi.getById(id!),
  });
  const { data: sellerProfile } = useQuery({
    queryKey: queryKeys.profile(product?.seller_id),
    queryFn: () => profileApi.get(product!.seller_id),
    enabled: !!product?.seller_id,
  });

  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (isError || !product)
    return <p className="text-red-500">Product not found.</p>;

  const productId = product.id;
  const images = product.images?.length
    ? product.images
    : product.image_url
      ? [{ id: product.id, image_url: product.image_url, position: 0 }]
      : [];

  function addProductToCart() {
    if (!user) {
      navigate(ROUTES.login);
      return;
    }
    addItem.mutate(
      { productId, quantity: 1 },
      {
        onSuccess: () => toast.success('Added to cart 🛒'),
        onError: () => toast.error('Could not add to cart'),
      },
    );
  }

  return (
    <article className="mx-auto w-full max-w-7xl">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm">
        <Link
          to={ROUTES.home}
          className="font-medium text-[var(--market-primary)] transition-colors hover:text-[var(--market-ink)]"
        >
          Browse
        </Link>
        <span aria-hidden="true" className="mx-2 text-gray-400">
          /
        </span>
        <span className="text-gray-500">Item details</span>
      </nav>

      <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,.9fr)] lg:gap-12">
        <ProductGallery product={product} images={images} />
        <ProductPurchasePanel
          product={product}
          sellerProfile={sellerProfile}
          isAddingToCart={addItem.isPending}
          onAddToCart={addProductToCart}
        />
      </div>
    </article>
  );
}
