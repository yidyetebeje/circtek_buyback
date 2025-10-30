"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserForm } from '@/components/admin/users/user-form';
import type { UserFormValues } from '@/types/user';
import { useCreateUser } from '@/hooks/admin/useUsers';
import { toast } from 'sonner';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

const NewUserPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createUserMutation = useCreateUser();
  const [preSelectedRole, setPreSelectedRole] = useState<string | null>(null);
  const envShopId = process.env.NEXT_PUBLIC_SHOP_ID ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : undefined;
 
  
  // Check if this is a shop_manager creation
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'shop_manager') {
      setPreSelectedRole('shop_manager');
    }
  }, [searchParams]);

    const handleSubmit = (formValues: import('@/components/admin/users/user-form').UserFormSubmitValues) => {
    const preparedValues = {
      ...formValues,
      warehouseId: formValues.warehouseId ? Number(formValues.warehouseId) : undefined,
      managed_shop_id: envShopId,
    } as unknown as UserFormValues;

    createUserMutation.mutate(preparedValues, {
      onSuccess: (data) => {
        toast.success(`User ${data.userName || formValues.userName} created successfully`);
        router.push('/admin/users');
      },
      onError: (error) => {
        toast.error(`Failed to create user: ${error.message}`);
        console.error('Error creating user:', error);
      }
    });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <AdminEditCard
      title={preSelectedRole === 'shop_manager' ? "Create Shop Manager" : "Create New User"}
      description={preSelectedRole === 'shop_manager' ? "Add a new shop manager to the system" : "Add a new user to the system"}
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/users', label: 'Users' },
        { label: preSelectedRole === 'shop_manager' ? 'New Shop Manager' : 'New User', isCurrentPage: true }
      ]}
    >
      <div className="w-full">
        
        <UserForm 
          onSubmit={handleSubmit}
          onCancel={handleCancel} 
          isLoading={createUserMutation.isPending}
        />
      </div>
    </AdminEditCard>
  );
};

export default NewUserPage; 