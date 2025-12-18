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
  tenantId?: number;
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

// Backend response format for user
interface BackendUser {
  id: number;
  name?: string | null;
  user_name?: string | null;
  status?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  role_id?: number | null;
  roleName?: string | null;
  roleSlug?: string | null;
  tenant_id?: number | null;
  warehouse_id?: number | null;
  managed_shop_id?: number | null;
  role?: {
    id: number;
    name: string;
    description?: string;
  } | null;
}

// Transform backend user to frontend User interface
function transformUser(backendUser: BackendUser): User {
  // Split name into fName and lName
  const nameParts = (backendUser.name || '').split(' ');
  const fName = nameParts[0] || '';
  const lName = nameParts.slice(1).join(' ') || '';

  return {
    id: backendUser.id,
    fName,
    lName,
    userName: backendUser.user_name,
    status: backendUser.status ?? true,
    createdAt: backendUser.created_at,
    updatedAt: backendUser.updated_at,
    roleId: backendUser.role_id,
    tenantId: backendUser.tenant_id,
    tenant_id: backendUser.tenant_id,
    warehouseId: backendUser.warehouse_id,
    managed_shop_id: backendUser.managed_shop_id,
    role: backendUser.role ? {
      id: backendUser.role.id,
      title: backendUser.role.name, // Map 'name' to 'title' for frontend
      slug: backendUser.role.name,
    } : null,
  };
}

export type UserResponse = ApiResponse<BackendUser>;
export type PaginatedUsersApiResponse = ApiResponse<BackendUser[]> & { meta: NonNullable<ApiResponse<BackendUser[]>['meta']> };

const USERS_ENDPOINT = '/roles-management/users'; // Updated endpoint

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
      data: response.data.map(transformUser),
      meta: response.meta,
    };
  },

  getUser: async (id: string): Promise<User> => {
    const response = await apiClient.get<UserResponse>(`${USERS_ENDPOINT}/${id}`, { isProtected: true });
    return transformUser(response.data);
  },

  createUser: async (userData: UserFormValues): Promise<User> => {
    const response = await apiClient.post<UserResponse>(`${USERS_ENDPOINT}/create`, userData, { isProtected: true });
    return transformUser(response.data);
  },

  updateUser: async (id: string, userData: Partial<UserFormValues>): Promise<User> => {
    const response = await apiClient.put<UserResponse>(`${USERS_ENDPOINT}/${id}`, userData, { isProtected: true });
    return transformUser(response.data);
  },

  updateUserRole: async (id: string, roleSlug: string): Promise<User> => {
    const response = await apiClient.put<UserResponse>(`${USERS_ENDPOINT}/${id}/role`, { roleSlug }, { isProtected: true });
    return transformUser(response.data);
  },

  deleteUser: async (id: string | number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/auth/users/${id}`, { isProtected: true });
    return {
      success: response.success,
      message: response.message
    };
  },
}; 