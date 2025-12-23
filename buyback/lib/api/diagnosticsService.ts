import { apiClient } from './base';
import { PaginatedResponse } from './types';

export interface TestedDevice {
    deviceId: number;  // Unique device identifier for grouping
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
    shop_id?: number;
}

// New types matching backend DiagnosticPublic interface
export interface DiagnosticPublic {
    id: number;
    created_at: Date | string | null;
    updated_at: Date | string | null;
    tenant_id: number;
    tenant_name?: string | null;
    tenant_logo_url?: string | null;
    warehouse_id: number;
    tester_id: number;
    device_id: number;
    lpn: string | null;
    serial_number: string | null;
    imei: string | null;
    passed_components: string | null;
    failed_components: string | null;
    pending_components: string | null;
    oem_status: string | null;
    battery_info: Record<string, unknown> | null;
    oem_info: Record<string, unknown> | null;
    label_printed: boolean | null;
    status: boolean | null;
    os_version: string | null;
    device_lock: string | null;
    carrier_lock: Record<string, unknown> | null;
    sim_lock: Record<string, unknown> | null;
    ESN: string | null;
    iCloud: Record<string, unknown> | null;
    eSIM: boolean | null;
    eSIM_erasure: boolean | null;
    make: string | null;
    model_no: string | null;
    model_name: string | null;
    device_type: string | null;
    device_serial: string | null;
    device_imei: string | null;
    device_lpn: string | null;
    device_sku: string | null;
    device_imei2: string | null;
    device_guid: string | null;
    device_description: string | null;
    device_storage: string | null;
    device_memory: string | null;
    device_color: string | null;
    device_created_at: Date | string | null;
    device_status: boolean | null;
    warehouse_name: string | null;
    tester_username: string | null;
}

export interface DiagnosticsApiResponse {
    data: DiagnosticPublic[];
    message: string;
    status: number;
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}

// Data mapper function to transform DiagnosticPublic to TestedDevice
function mapDiagnosticToTestedDevice(diagnostic: DiagnosticPublic): TestedDevice {
    return {
        deviceId: diagnostic.device_id,
        deviceTransactionId: diagnostic.id,
        transactionSetId: diagnostic.id, // Using same ID since transactionSetId doesn't exist in new structure
        testedAt: diagnostic.created_at ? new Date(diagnostic.created_at).toISOString() : '',
        deviceTransactionUpdatedAt: diagnostic.updated_at ? new Date(diagnostic.updated_at).toISOString() : '',
        warehouseId: diagnostic.warehouse_id,
        warehouseName: diagnostic.warehouse_name,
        serial: diagnostic.serial_number || diagnostic.device_serial || '',
        imei: diagnostic.imei || diagnostic.device_imei || '',
        make: diagnostic.make || '',
        modelName: diagnostic.model_name || '',
        grade: null, // Not available in new structure
        color: diagnostic.device_color,
        storage: diagnostic.device_storage ? parseInt(diagnostic.device_storage, 10) : null,
        memory: diagnostic.device_memory ? parseInt(diagnostic.device_memory, 10) : null,
        testInfo: {
            passedResult: diagnostic.passed_components,
            failedResult: diagnostic.failed_components,
            pendingResult: diagnostic.pending_components,
        },
        oemStatus: diagnostic.oem_status,
        notes: null, // Not available in new structure
        uid: diagnostic.device_guid,
        skuCode: diagnostic.device_sku,
        platform: diagnostic.device_type,
        buildNo: null, // Not available in new structure
        appVersion: diagnostic.os_version,
        labelPrinted: diagnostic.label_printed ? 1 : 0,
        deviceTransactionCreatedAt: diagnostic.device_created_at ? new Date(diagnostic.device_created_at).toISOString() : '',
    };
}

const diagnosticsService = {
    async getTestedDevices(params: GetTestedDevicesParams = {}): Promise<PaginatedResponse<TestedDevice>> {
        const envShopId = process.env.NEXT_PUBLIC_SHOP_ID ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : undefined;

        // Map frontend parameters to backend parameters
        const backendParams: Record<string, string | number | boolean | undefined> = {
            page: params.page || 1,
            limit: params.pageSize || 10,
        };

        // Map serial parameter to identifier
        if (params.serial) {
            backendParams.identifier = params.serial;
        }

        // Map warehouseId to warehouse_id
        if (params.warehouseId) {
            backendParams.warehouse_id = params.warehouseId;
        }

        // Map sortBy to sort_by and sort_dir
        if (params.sortBy) {
            backendParams.sort_by = 'created_at';
            backendParams.sort_dir = params.sortBy === 'newest' ? 'desc' : 'asc';
        }

        // Handle tenant_id from shopId or env
        if (params.shopId !== undefined) {
            backendParams.shop_id = params.shopId || envShopId;
        }

        // Filter out undefined values
        const filteredParams = Object.fromEntries(
            Object.entries(backendParams).filter(([, value]) => value !== undefined)
        );

        try {
            // Call new diagnostics tests endpoint
            const response: DiagnosticsApiResponse = await apiClient.get('/diagnostics/tests', { params: filteredParams });

            // Map the response to the expected PaginatedResponse format
            const mappedData = response.data.map(mapDiagnosticToTestedDevice);

            return {
                data: mappedData,
                pagination: {
                    page: response.meta.page,
                    limit: response.meta.limit,
                    total: response.meta.total,
                    totalPages: Math.ceil(response.meta.total / response.meta.limit)
                }
            };
        } catch (error) {
            console.error('Error fetching tested devices:', error);
            throw error;
        }
    }
};

export default diagnosticsService; 