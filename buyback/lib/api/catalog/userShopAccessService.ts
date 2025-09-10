/**
 * UserShopAccess Service
 * Handles API operations related to user shop access permissions.
 */
import { ApiClient, createApiClient } from '../base';
import { ApiResponse } from '../types';

// Define the shape of a UserShopAccess record, mirroring the backend
// This should align with what the backend returns, especially from userShopAccessRepository.findByUserId
export interface UserShopAccess {
  id: number;
  userId: number;
  shopId: number;
  shopName?: string; // If joined from shops table
  canView: boolean;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
  // Add any other relevant fields returned by the backend API
}

export interface GrantUserShopAccessPayload {
  userId: number;
  shopId: number;
  canView?: boolean;
  canEdit?: boolean;
}

export interface UpdateUserShopAccessPayload {
  canView?: boolean;
  canEdit?: boolean;
}

export class UserShopAccessService {
  private apiClient: ApiClient;
  private baseEndpoint = '/api/catalog/shop-access';

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Get all shop access records for a specific user.
   */
  async getUserShopAccess(userId: number): Promise<ApiResponse<UserShopAccess[]>> {
    return this.apiClient.get<ApiResponse<UserShopAccess[]>>(`${this.baseEndpoint}/user/${userId}`);
  }

  /**
   * Grant a user access to a shop.
   */
  async grantShopAccess(payload: GrantUserShopAccessPayload): Promise<ApiResponse<UserShopAccess>> {
    return this.apiClient.post<ApiResponse<UserShopAccess>>(`${this.baseEndpoint}/`, payload);
  }

  /**
   * Update a user's access to a shop.
   */
  async updateShopAccess(
    userId: number,
    shopId: number,
    payload: UpdateUserShopAccessPayload
  ): Promise<ApiResponse<UserShopAccess>> {
    return this.apiClient.put<ApiResponse<UserShopAccess>>(
      `${this.baseEndpoint}/user/${userId}/shop/${shopId}`,
      payload
    );
  }

  /**
   * Revoke a user's access to a shop.
   */
  async revokeShopAccess(userId: number, shopId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiClient.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseEndpoint}/user/${userId}/shop/${shopId}`
    );
  }
}

// Create a default instance
export const userShopAccessService = new UserShopAccessService();

// Export a function to create an instance with a specific client
export const createUserShopAccessService = (apiClient?: ApiClient) => new UserShopAccessService(apiClient); 