import { useQuery } from '@tanstack/react-query';
import { featuredDeviceService, FeaturedDevice, FeaturedDeviceFilters } from '@/lib/api';

/**
 * Re-export types from the service
 */
export type { FeaturedDevice, FeaturedDeviceFilters };

/**
 * Custom hook to fetch featured devices with optional filtering
 * @param params Query parameters for filtering featured devices
 * @returns Query result with featured devices data
 */
export function useFeaturedDevices(params: FeaturedDeviceFilters = {}) {
  return useQuery({
    queryKey: ['featuredDevices', params],
    queryFn: async () => {
      return featuredDeviceService.getFeaturedDevices(params);
    },
    staleTime: 1000 * 60, // 1 minute
  });
}
