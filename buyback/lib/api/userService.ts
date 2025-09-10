import { apiClient } from './base';
import type { User, PaginatedUsersResponse, UserFormValues } from '@/types/user';

// Interface for query params to list users, aligning with backend
export interface ListUsersQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  roleId?: number;
  roleSlug?: string; // Filter by role slug (e.g., 'shop_manager', 'admin', 'client')
  status?: boolean;
  clientId?: number;
  shopId?: number;
}

// Generic API response structure from the backend
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type UserResponse = ApiResponse<User>;
export type PaginatedUsersApiResponse = ApiResponse<User[]> & { meta: NonNullable<ApiResponse<User[]>['meta']> };

const USERS_ENDPOINT = '/api/roles-management/users'; // Updated endpoint

export const userService = {
  listUsers: async (params: ListUsersQueryParams = {}): Promise<PaginatedUsersResponse> => {
    const envShopId = process.env.NEXT_PUBLIC_SHOP_ID ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : undefined;

    const mergedParams: ListUsersQueryParams = { ...params };
    if (mergedParams.shopId === undefined && envShopId !== undefined) {
      mergedParams.shopId = envShopId;
    }

    const response = await apiClient.get<PaginatedUsersApiResponse>(USERS_ENDPOINT, {
      params: mergedParams as Record<string, string | number | boolean | undefined>,
      isProtected: true,
    });
    return {
      data: response.data,
      meta: response.meta,
    };
  },

  getUser: async (id: string): Promise<User> => {
    const response = await apiClient.get<UserResponse>(`${USERS_ENDPOINT}/${id}`, { isProtected: true });
    return response.data;
  },

  createUser: async (userData: UserFormValues): Promise<User> => {
    const response = await apiClient.post<UserResponse>(`${USERS_ENDPOINT}/create`, userData, { isProtected: true });
    return response.data;
  },

  updateUser: async (id: string, userData: Partial<UserFormValues>): Promise<User> => {
    const response = await apiClient.put<UserResponse>(`${USERS_ENDPOINT}/${id}`, userData, { isProtected: true });
    return response.data;
  },
  
  updateUserRole: async (id: string, roleSlug: string): Promise<User> => {
    const response = await apiClient.put<UserResponse>(`${USERS_ENDPOINT}/${id}/role`, { roleSlug }, { isProtected: true });
    return response.data;
  },

  deleteUser: async (id: string | number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/api/auth/users/${id}`, { isProtected: true });
    return {
      success: response.success,
      message: response.message
    };
  },
}; 