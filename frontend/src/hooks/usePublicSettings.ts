import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import { MAX_PRODUCT_IMAGES } from '../constants/product';

// Reads admin-configurable public settings.
// Falls back to the frontend constant while loading or if the request fails.
export function usePublicSettings() {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: settingsApi.getPublic,
    staleTime: 5 * 60_000, // settings rarely change — cache for 5 min
  });

  return {
    maxImages: data?.max_images_per_product ?? MAX_PRODUCT_IMAGES,
  };
}
