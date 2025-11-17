/**
 * Shop Service
 * Handles all API operations related to shops
 */

import { ApiClient, createApiClient } from '../base';
import { ApiResponse, PaginatedResponse, QueryParams } from '../types';
import { Shop } from '@/types/catalog';
import { CategoryType } from '@/components/homepage/category-variants';
import { ApiCategory, mapApiCategoriesToFrontend } from './categoryUtils';
import { Model } from '@/types/catalog';
import { ShopConfig } from '@/types/shop';

export interface PublishedModelsParams extends QueryParams {
  orderBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
  categoryId?: number;
  brandId?: number;
  modelSeriesId?: number;
  tenantId?: number;
}

export class ShopService {
  private apiClient: ApiClient;
  private baseEndpoint = '/catalog/shops'; // Use the exact URL path from the API docs

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get a paginated list of all shops
   */
  async getShops(params?: QueryParams): Promise<PaginatedResponse<Shop>> {
    return this.apiClient.get<PaginatedResponse<Shop>>(this.baseEndpoint, { params });
  }

  /**
   * Get a shop by ID
   */
  async getShopById(id: number): Promise<ApiResponse<Shop>> {
    return this.apiClient.get<ApiResponse<Shop>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Get published categories for a specific shop
   */
  async getPublishedCategories(shopId: number, params?: QueryParams): Promise<PaginatedResponse<CategoryType>> {
    // Get the raw API response
    const response = await this.apiClient.get<PaginatedResponse<ApiCategory>>(
      `${this.baseEndpoint}/${shopId}/published-categories`, 
      { params }
    );
    console.log('response', response);
    
    // Map the API response to our frontend format
    return {
      ...response,
      data: mapApiCategoriesToFrontend(response.data)
    };
  }

  /**
   * Create a new shop
   */
  async createShop(shop: Omit<Shop, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Shop>> {
    try {
      const cleanedShop = {
        ...shop,
        name: shop.name?.trim(),
        organization: shop.organization?.trim(),
        phone: shop.phone?.trim(),
        logo: shop.logo?.trim() || ''
      };

      if (!cleanedShop.name) {
        throw new Error('Shop name is required and cannot be empty');
      }
      if (!cleanedShop.organization) {
        throw new Error('Organization name is required and cannot be empty');
      }
      if (!cleanedShop.phone) {
        throw new Error('Phone number is required and cannot be empty');
      }

      return await this.apiClient.post<ApiResponse<Shop>>(this.baseEndpoint, cleanedShop);
    } catch (error: unknown) {
      console.error("Error creating shop:", error);
      if(error && typeof error === 'object' && 'message' in error) {
        throw new Error(error.message as string);
      }
      // Prioritize extracting the specific backend error message
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: { error?: string, message?: string } } };
        const errorMessage = apiError.response?.data?.error || apiError.response?.data?.message;
        if (errorMessage) {
          throw new Error(errorMessage);
        }
      }

      // Fallback for non-API errors or unexpected structures
      if (error instanceof Error) {
        // Avoid re-throwing generic messages
        if (error.message.includes('unexpected error')) {
            throw new Error('An unexpected error occurred. Please contact support.');
        }
        throw error; // Re-throw the original descriptive error
      }
      
      // Final, truly unexpected fallback
      throw new Error('An unexpected network or server error occurred.');
    }
  }

  /**
   * Update a shop
   */
  async updateShop(id: number, shop: Partial<Shop>): Promise<ApiResponse<Shop>> {
    return this.apiClient.put<ApiResponse<Shop>>(`${this.baseEndpoint}/${id}`, shop);
  }

  /**
   * Delete a shop
   */
  async deleteShop(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Upload a shop logo
   */
  async uploadShopLogo(id: number, file: File): Promise<ApiResponse<{ logoUrl: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Don't set Content-Type header manually - browser will set it with boundary
    return this.apiClient.post<ApiResponse<{ logoUrl: string }>>(
      `${this.baseEndpoint}/${id}/logo`,
      formData
    );
  }



  /**
   * Get published models for a specific shop and category slug
   */
  async getPublishedModelsByCategorySlug(
    shopId: number, 
    categorySlug: string, 
    params?: QueryParams & {
      orderBy?: string;
      order?: 'asc' | 'desc';
      search?: string;
      brandId?: number;
      modelSeriesId?: number;
      tenantId?: number;
    }
  ): Promise<PaginatedResponse<Model>> {
    return this.apiClient.get<PaginatedResponse<Model>>(
      `${this.baseEndpoint}/${shopId}/category/${categorySlug}/models`, 
      { params }
    );
  }

  /**
   * Get published models for a specific shop
   */
  async getPublishedModels(
    shopId: number,
    params?: PublishedModelsParams
  ): Promise<PaginatedResponse<Model>> {
    return this.apiClient.get<PaginatedResponse<Model>>(
      `${this.baseEndpoint}/${shopId}/published-models`,
      { params }
    );
  }

  /**
   * Get published model details for a specific shop and model SEF URL
   */
  async getPublishedModelDetailsBySefUrl(
    shopId: number,
    modelSefUrl: string
  ): Promise<ApiResponse<Model>> {
    return this.apiClient.get<ApiResponse<Model>>(
      `${this.baseEndpoint}/${shopId}/model/${modelSefUrl}`
    );
  }

  /**
   * Get configuration for a specific shop
   */
  async getShopConfig(id: number): Promise<ApiResponse<{ config: ShopConfig }>> {
    return this.apiClient.get<ApiResponse<{ config: ShopConfig }>>(`${this.baseEndpoint}/${id}/config`);
  }

  /**
   * Update configuration for a specific shop
   */
  async updateShopConfig(id: number, config: ShopConfig): Promise<ApiResponse<{ config: ShopConfig }>> {
    return this.apiClient.put<ApiResponse<{ config: ShopConfig }>>(`${this.baseEndpoint}/${id}/config`, { config });
  }
}

// Create a default instance
export const shopService = new ShopService();

// Export a function to create an instance with a specific client
export const createShopService = (apiClient?: ApiClient) => new ShopService(apiClient); 