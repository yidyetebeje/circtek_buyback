import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PaginatedUsersResponse, User, UserFormValues } from '@/types/user';
import { userService, ListUsersQueryParams } from '@/lib/api/userService'; // Updated import

export const useUsers = (params: ListUsersQueryParams = {}) => {
  return useQuery<PaginatedUsersResponse, Error>({
    queryKey: ['admin', 'users', params], // More specific query key
    queryFn: () => userService.listUsers(params),
    placeholderData: (previousData) => previousData,
  });
};

export const useUser = (userId: string | number | null) => {
  return useQuery<User, Error>({
    queryKey: ['admin', 'user', userId],
    queryFn: () => {
      if (!userId) {
        return Promise.reject(new Error("User ID is required."));
      }
      return userService.getUser(String(userId)); // userService.getUser expects string
    },
    enabled: !!userId,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation<User, Error, UserFormValues>({
    mutationFn: (userData: UserFormValues) => userService.createUser(userData),
    onSuccess: () => {
      // Invalidate and refetch users list after successful creation
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    //onError: (error) => { // Optional: Handle error specifically here or in the component
    //  console.error('Error creating user:', error.message);
    //}
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation<User, Error, { id: string; userData: Partial<UserFormValues> }>({
    mutationFn: ({ id, userData }) => userService.updateUser(id, userData),
    onSuccess: (data, variables) => {
      // Invalidate and refetch users list and the specific user
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', variables.id] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; message: string }, Error, string | number>({  
    mutationFn: (userId) => userService.deleteUser(userId),
    onSuccess: () => {
      // Invalidate and refetch users list after successful deletion
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

// Placeholder for updateUserRole if needed separately
// export const useUpdateUserRole = () => {
//   const queryClient = useQueryClient();
//   return useMutation<User, Error, { id: string; roleSlug: string }>({
//     mutationFn: ({ id, roleSlug }) => userService.updateUserRole(id, roleSlug),
//     onSuccess: (data, variables) => {
//       queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
//       queryClient.invalidateQueries({ queryKey: ['admin', 'user', variables.id] });
//     },
//   });
// }; 