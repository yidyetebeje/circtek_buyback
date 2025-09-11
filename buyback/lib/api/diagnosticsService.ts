import { apiClient } from './base';
import { PaginatedResponse } from './types';

export interface TestedDevice {
    deviceTransactionId: number;
    transactionSetId: number;
    testedAt: string;
    deviceTransactionUpdatedAt: string;
    warehouseId: number;
    warehouseName: string | null;
    serial: string;
    imei: string;
    make: string;
    modelName: string;
    grade: string | null;
    color: string | null;
    storage: number | null;
    memory: number | null;
    testInfo: {
        passedResult?: string | null;
        failedResult?: string | null;
        pendingResult?: string | null;
    } | null;
    oemStatus: string | null;
    notes: string | null;
    uid: string | null;
    skuCode: string | null;
    platform: string | null;
    buildNo: string | null;
    appVersion: string | null;
    labelPrinted: number | null;
    deviceTransactionCreatedAt: string;
}

export interface GetTestedDevicesParams {
    page?: number;
    pageSize?: number;
    serial?: string;
    warehouseId?: number;
    sortBy?: 'newest' | 'oldest';
    shopId?: number;
}

const diagnosticsService = {
    getTestedDevices(params: GetTestedDevicesParams = {}): Promise<PaginatedResponse<TestedDevice>> {
        const envShopId = process.env.NEXT_PUBLIC_SHOP_ID ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : undefined;
        const mergedParams = { ...params } as GetTestedDevicesParams;
        if (mergedParams.shopId === undefined && envShopId !== undefined) {
            mergedParams.shopId = envShopId;
        }

        const filteredParams = Object.fromEntries(
            Object.entries(mergedParams).filter(([, value]) => value !== '' && value !== undefined)
        );
        return apiClient.get('/diagnostics/tested-devices', { params: filteredParams });
    }
};

export default diagnosticsService; 