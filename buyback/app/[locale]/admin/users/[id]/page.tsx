"use client";

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser, useUpdateUser } from '@/hooks/admin/useUsers';
import { toast } from 'sonner';
import { UserForm, type UserFormSubmitValues, type UserFormValues } from '@/components/admin/users/user-form';
import { AdminEditCard } from '@/components/admin/AdminEditCard';
import { Loader2 } from 'lucide-react';

const UserEditPage = () => {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const { data: user, isLoading, isError, error } = useUser(userId);

  const updateUserMutation = useUpdateUser();

  const handleSubmit = (values: UserFormSubmitValues) => {
    if (!userId) return;

    updateUserMutation.mutate(
      { id: userId, userData: values },
      {
        onSuccess: () => {
          toast.success('User updated successfully!');
          router.push('/admin/users');
          router.refresh(); 
        },
        onError: (error: any) => {
          toast.error(`Failed to update user: ${error.message}`);
        },
      }
    );
  };

  const handleCancel = () => {
    router.push('/admin/users');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return <div>Error loading user data: {error.message}</div>;
  }
  
  if (!user) {
    return <div>User not found.</div>;
  }

  const initialFormData: Partial<UserFormValues> = {
    fName: user.fName || '',
    lName: user.lName || '',
    userName: user.userName || '',
    email: user.email || '',
    status: user.status ?? true,
    organizationName: user.organizationName || '',
    warehouseId: user.warehouseId ? String(user.warehouseId) : undefined,
  };

  return (
    <AdminEditCard
      title={`Edit User: ${user.userName || user.fName}`}
      description="Update user information and permissions"
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/users', label: 'Users' },
        { label: `Edit ${user.userName || user.fName}`, isCurrentPage: true }
      ]}
    >
      <UserForm 
        initialData={{...initialFormData, id: user.id}}
        onSubmit={handleSubmit} 
        onCancel={handleCancel} 
        isLoading={updateUserMutation.isPending}
        showRoleSelection={false}
      />
    </AdminEditCard>
  );
};

export default UserEditPage; 