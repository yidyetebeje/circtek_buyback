'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  userShopAccessService,
  UserShopAccess,
  GrantUserShopAccessPayload,
  UpdateUserShopAccessPayload
} from '@/lib/api/catalog/userShopAccessService';
import { ApiResponse } from '@/lib/api/types';

/**
 * Hook for retrieving a user's shop access permissions.
 */
export const useGetUserShopAccess = (userId: number) => {
  return useQuery<ApiResponse<UserShopAccess[]>, Error>({
    queryKey: ['userShopAccess', userId],
    queryFn: () => userShopAccessService.getUserShopAccess(userId),
    enabled: !!userId, // Only run query if userId is truthy
  });
};

/**
 * Hook for granting shop access to a user.
 */
export const useGrantShopAccess = () => {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<UserShopAccess>,
    Error,
    GrantUserShopAccessPayload
  >({
    mutationFn: (payload) => userShopAccessService.grantShopAccess(payload),
    onSuccess: (data, variables) => {
      // Invalidate queries related to this user's shop access to refetch.
      queryClient.invalidateQueries({ queryKey: ['userShopAccess', variables.userId] });
      // Optionally, if you have a list of all shops a user can administer, invalidate that too.
    },
  });
};

/**
 * Hook for updating a user's shop access.
 */
export const useUpdateShopAccess = () => {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<UserShopAccess>,
    Error,
    { userId: number; shopId: number; payload: UpdateUserShopAccessPayload }
  >({
    mutationFn: ({ userId, shopId, payload }) => userShopAccessService.updateShopAccess(userId, shopId, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userShopAccess', variables.userId] });
    },
  });
};

/**
 * Hook for revoking a user's shop access.
 */
export const useRevokeShopAccess = () => {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<{ success: boolean }>, 
    Error, 
    { userId: number; shopId: number }
  >({
    mutationFn: ({ userId, shopId }) => userShopAccessService.revokeShopAccess(userId, shopId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userShopAccess', variables.userId] });
    },
  });
}; 