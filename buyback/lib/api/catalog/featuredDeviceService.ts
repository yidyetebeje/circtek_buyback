import { ApiClient, createApiClient } from '../base';
import { ApiResponse, PaginatedResponse } from '../types';

// Define types for featured device
export interface FeaturedDevice {
  id: number;
  modelId: number;
  shopId: number;
  tenantId?: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  model?: {
    id: number;
    title: string;
    brand_id: number;
    model_image?: string | null;
    base_price?: number | null;
    sef_url: string;
    brand?: {
      id: number;
      title: string;
    }
  };
  shop?: {
    id: number;
    name: string;
    logo?: string | null;
    organization?: string | null;
    phone?: string | null;
  }
}

// Define type for creating a new featured device
export interface CreateFeaturedDevicePayload {
  modelId: number;
  shopId: number;
  tenantId?: number;
  isPublished?: boolean;
}

// Define type for updating a featured device
export interface UpdateFeaturedDevicePayload {
  isPublished?: boolean;
}

// Define filter parameters for fetching featured devices
export interface FeaturedDeviceFilters extends Record<string, string | number | boolean | number[] | undefined> {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
  shopId?: number | number[];
  modelId?: number | number[];
  tenantId?: number | number[];
  isPublished?: boolean;
  modelTitle?: string;
  shopName?: string;
}

/**
 * Service for managing featured devices
 */
export class FeaturedDeviceService {
  private apiClient: ApiClient;
  private baseEndpoint = '/catalog/featured-devices'; // Full endpoint path for featured devices API

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }
  /**
   * Get a list of featured devices with optional filtering
   */
  async getFeaturedDevices(filters: FeaturedDeviceFilters = {}): Promise<PaginatedResponse<FeaturedDevice>> {
    return this.apiClient.get<PaginatedResponse<FeaturedDevice>>(this.baseEndpoint, { params: filters });
  }

  /**
   * Get a list of all featured devices (admin access, includes unpublished)
   */
  async getFeaturedDevicesAdmin(filters: FeaturedDeviceFilters = {}): Promise<PaginatedResponse<FeaturedDevice>> {
    return this.apiClient.get<PaginatedResponse<FeaturedDevice>>(`${this.baseEndpoint}/all`, { params: filters });
  }
  
  /**
   * Get a specific featured device by ID
   */
  async getFeaturedDevice(id: number): Promise<ApiResponse<FeaturedDevice>> {
    return this.apiClient.get<ApiResponse<FeaturedDevice>>(`${this.baseEndpoint}/${id}`);
  }
  
  /**
   * Create a new featured device
   */
  async createFeaturedDevice(data: CreateFeaturedDevicePayload): Promise<ApiResponse<FeaturedDevice>> {
    return this.apiClient.post<ApiResponse<FeaturedDevice>>(this.baseEndpoint, data);
  }
  
  /**
   * Update a featured device
   */
  async updateFeaturedDevice(id: number, data: UpdateFeaturedDevicePayload): Promise<ApiResponse<FeaturedDevice>> {
    return this.apiClient.put<ApiResponse<FeaturedDevice>>(`${this.baseEndpoint}/${id}`, data);
  }
  
  /**
   * Delete a featured device
   */
  async deleteFeaturedDevice(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/${id}`);
  }
}

// Create a default instance
export const featuredDeviceService = new FeaturedDeviceService();

// Export a function to create an instance with a specific client
export const createFeaturedDeviceService = (apiClient?: ApiClient) => {
  return new FeaturedDeviceService(apiClient);
};
