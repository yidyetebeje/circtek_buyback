"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

import { ShopFormValues } from '@/components/admin/catalog/shop-form';
import { ShopStepper, SelectedEntities } from '@/components/admin/catalog/shop-stepper';
import { Separator } from '@/components/ui/separator';
import { useCreateShop, useUploadShopLogo } from '@/hooks/catalog/useShops';
import { shopCatalogService } from '@/lib/api/catalog/shopCatalogService';

export default function CreateShopPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session?.user?.roleSlug === 'shop_manager') {
      toast.error('Shop Managers cannot create new shops');
      if (session?.user?.managed_shop_id) {
        router.push(`/admin/shops/${session.user.managed_shop_id}`);
      } else {
        router.push('/admin/dashboards');
      }
    }
  }, [session, router]);

  // Use API mutation hooks
  const { mutateAsync: createShop, isPending: isCreating } = useCreateShop();
  const { mutate: uploadLogo } = useUploadShopLogo();

  // Logo state management
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleComplete = async (
    values: ShopFormValues,
    selectedEntities: SelectedEntities
  ) => {
    // Guard clauses for session state
    if (status === 'loading') {
      toast.error('Please wait, loading user session...');
      return;
    }

    if (status === 'unauthenticated' || !session?.user?.id) {
      toast.error('You must be logged in to create a shop.');
      router.push('/admin/login');
      return;
    }

    const shopPayload = {
      ...values,
      tenant_id: session.user.tenantId ? Number(session.user.tenantId) : 0,
      owner_id: Number(session.user.id),
      logo: values.logo || '',
      icon: null,
      active: true,
      config: null,
    };

    try {
      const response = await createShop(shopPayload);
      const createdShop = response.data;

      // Handle logo upload (non-blocking)
      if (logoFile) {
        uploadLogo(
          { shopId: createdShop.id, file: logoFile },
          {
            onError: (error: Error) => {
              toast.error(`Shop created, but logo upload failed: ${error.message}`);
            },
          }
        );
      }

      // Bulk publish catalog selections if any were chosen
      if (
        selectedEntities.categories.length > 0 ||
        selectedEntities.brands.length > 0 ||
        selectedEntities.modelSeries.length > 0
      ) {
        // The success toast for publishing is handled inside the service, so no toast here.
        shopCatalogService
          .bulkPublishAll(createdShop.id, selectedEntities)
          .catch((err: Error) => {
            toast.error(
              `Shop created, but failed to publish catalog items: ${err.message}`
            );
          });
      }

      router.push('/admin/shops');
    } catch (error) {
      // Error toast was already shown by the hook, but ensure promise rejection
      // is propagated to the stepper so it can handle its own loading state.
      throw error;
    }
  };

  const handleLogoUpload = async (file: File): Promise<string> => {
    setLogoFile(file);
    return URL.createObjectURL(file);
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
  };

  const handleCancel = () => {
    router.push('/admin/shops');
  };

  return (
    <div className="container mx-auto py-10 bg-white p-6 rounded-lg">
      <h1 className="text-2xl font-bold mb-6">Create New Shop</h1>
      <Separator className="mb-8" />

      {status === 'loading' ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading session...</p>
          </div>
        </div>
      ) : status === 'unauthenticated' ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">You must be logged in to create a shop.</p>
          <button
            onClick={() => router.push('/admin/login')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <ShopStepper
          onComplete={handleComplete}
          onCancel={handleCancel}
          isLoading={isCreating}
          onLogoUpload={handleLogoUpload}
          onLogoRemove={handleLogoRemove}
          initialData={{
            name: '',
            organization: '',
            phone: '',
          }}
        />
      )}
    </div>
  );
} 