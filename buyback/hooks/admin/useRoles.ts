import { useQuery } from '@tanstack/react-query';
import { PaginatedRolesResponse, Role } from '@/types/user'; // Using Role and PaginatedRolesResponse from user types
import { apiClient } from '@/lib/api/base'; // Corrected import path

interface GetRolesParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  // Add other filter params as needed
}

const ROLES_ENDPOINT = '/api/roles-management/roles'; 

const fetchRoles = async (params: GetRolesParams): Promise<PaginatedRolesResponse> => {
  // Explicitly type the response from apiClient.get
  const response: PaginatedRolesResponse = await apiClient.get<PaginatedRolesResponse>(ROLES_ENDPOINT, {
    params: params as Record<string, string | number | boolean | undefined>,
    isProtected: true, 
  });
  return response; 
};

const fetchRoleById = async (id: string): Promise<Role> => {
  // Explicitly type the response from apiClient.get
  const response: Role = await apiClient.get<Role>(`${ROLES_ENDPOINT}/${id}`, { 
    isProtected: true 
  });
  return response; 
};

export const useRoles = (params: GetRolesParams) => {
  return useQuery<PaginatedRolesResponse, Error>({
    queryKey: ['roles', params], 
    queryFn: () => fetchRoles(params),
    placeholderData: (previousData) => previousData, 
  });
};

export const useRole = (id: string | undefined) => {
  return useQuery<Role, Error>({
    queryKey: ['role', id],
    queryFn: () => fetchRoleById(id!), 
    enabled: !!id, 
  });
}; 