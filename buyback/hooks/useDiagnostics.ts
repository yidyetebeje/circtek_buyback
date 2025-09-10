import { useQuery } from '@tanstack/react-query';
import diagnosticsService, { GetTestedDevicesParams } from '@/lib/api/diagnosticsService';

const DIAGNOSTICS_QUERY_KEY = 'diagnostics';

export const useTestedDevices = (params: GetTestedDevicesParams = {}) => {
    const envShopId = process.env.NEXT_PUBLIC_SHOP_ID ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : undefined;
    const mergedParams = { ...params };
    if (mergedParams.shopId === undefined && envShopId !== undefined) {
        mergedParams.shopId = envShopId;
    }

    return useQuery({
        queryKey: [DIAGNOSTICS_QUERY_KEY, 'list', mergedParams],
        queryFn: () => diagnosticsService.getTestedDevices(mergedParams),
        retry: false,
        staleTime: 30000, // 30 seconds
    });
}; 