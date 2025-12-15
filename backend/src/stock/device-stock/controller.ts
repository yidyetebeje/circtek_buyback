import { DeviceStockRepository, deviceStockRepository } from "./repository";
import { DeviceStockQueryInput } from "./types";

export class DeviceStockController {
    constructor(private readonly repository: DeviceStockRepository) { }

    /**
     * List device stock items with pagination and filtering
     */
    async list(query: DeviceStockQueryInput, tenantId?: number) {
        try {
            const result = await this.repository.findAll({ ...query, tenantId });
            return {
                data: result.data,
                meta: result.meta,
                message: 'Device stock retrieved successfully',
                status: 200,
            };
        } catch (error) {
            console.error('Error fetching device stock:', error);
            return {
                data: [],
                meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
                message: 'Failed to fetch device stock',
                status: 500,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Get a single device stock item by ID
     */
    async getById(id: number, tenantId?: number) {
        try {
            const item = await this.repository.findById(id, tenantId);

            if (!item) {
                return {
                    data: null,
                    message: 'Device stock item not found',
                    status: 404,
                };
            }

            return {
                data: item,
                message: 'Device stock item retrieved successfully',
                status: 200,
            };
        } catch (error) {
            console.error('Error fetching device stock item:', error);
            return {
                data: null,
                message: 'Failed to fetch device stock item',
                status: 500,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Get available filter options
     */
    async getFilters(params: { warehouseId?: number; shopId?: number; isDead?: boolean }, tenantId?: number) {
        try {
            const filters = await this.repository.getFilters({ ...params, tenantId });
            return {
                data: filters,
                message: 'Filters retrieved successfully',
                status: 200,
            };
        } catch (error) {
            console.error('Error fetching filters:', error);
            return {
                data: {
                    modelNames: [],
                    storage: [],
                    colorNames: [],
                    skus: [],
                    grades: [],
                },
                message: 'Failed to fetch filters',
                status: 500,
                error: (error as Error).message,
            };
        }
    }
}

// Export singleton instance
export const deviceStockController = new DeviceStockController(deviceStockRepository);
