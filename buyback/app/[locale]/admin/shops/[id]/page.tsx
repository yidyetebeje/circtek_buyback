"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { ShopForm, ShopFormValues } from '@/components/admin/catalog/shop-form';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useShop, useUpdateShop, useUploadShopLogo } from '@/hooks/catalog/useShops';
import type { Shop } from '@/types/catalog';

export default function EditShopPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = params.id ? parseInt(params.id as string, 10) : null;
  const { data: session } = useSession();
  
  // Verify shop manager can only access their managed shop
  useEffect(() => {
    if (session?.user?.roleSlug === 'shop_manager') {
     
      const managedShopId = session.user.managed_shop_id;
      if (managedShopId !== shopId) {
        toast.error('You can only access your managed shop');
        if (managedShopId) {
          router.push(`/admin/shops/${managedShopId}`);
        } else {
          router.push('/admin/dashboards');
        }
      }
    }
  }, [session, shopId, router]);
  
  // Logo state management
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Use API hooks
  const { data: shopResponse, isLoading, error } = useShop(shopId as number);
  const { mutateAsync: updateShopAsync, isPending: isUpdating } = useUpdateShop();
  const { mutate: uploadLogo } = useUploadShopLogo();
  
  // Get shop data from response
  const shop = shopResponse?.data;
  
  const handleUpdateShop = async (values: ShopFormValues) => {
    if (!shop || !shopId) return;

    // Determine if the logo has been removed (no file selected **and** form value is null)
    const shouldRemoveLogo = !logoFile && values.logo === null;

    // Build the update payload
    const updatePayload: Partial<Shop> = {
      name: values.name,
      organization: values.organization || null,
      phone: values.phone || null,
      active: values.active === undefined ? shop.active : values.active,
    };

    // Only include logo field if it needs to be removed
    if (shouldRemoveLogo) {
      updatePayload.logo = null;
    }

    // Update the shop (basic fields & optional logo removal)
    try {
      await updateShopAsync({ id: shopId, ...updatePayload });

      // If a new logo file was selected, upload it after the main update succeeds
      if (logoFile) {
        await new Promise<void>((resolve, reject) => {
          uploadLogo(
            { shopId, file: logoFile },
            {
              onSuccess: () => resolve(),
              onError: (error) => {
                toast.error(`Failed to upload logo: ${error.message}`);
                reject(error);
              },
            }
          );
        });
      }

      toast.success("Shop updated successfully!");
      router.push("/admin/shops");
    } catch (error: unknown) {
      // If the main update or the subsequent upload fails, show an error
      console.error("Error updating shop:", error);
      const errMessage = error instanceof Error ? error.message : "Failed to update shop";
      toast.error(errMessage);
    }
  };
  
  const handleLogoUpload = async (file: File): Promise<string> => {
    setLogoFile(file);
   
    return Promise.resolve(URL.createObjectURL(file));
  };
  
  const handleLogoRemove = () => {
    setLogoFile(null);
  };
  

  
  const handleCancel = () => {
    router.push('/admin/shops');
  };
  
  // Form initial data from the shop object
  const initialData = shop ? {
    id: shop.id,
    name: shop.name,
    organization: shop.organization || '',
    phone: shop.phone || '',
    logo: shop.logo || '',
    active: shop.active === null ? true : shop.active,
  } : undefined;
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg">Loading shop details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !shop) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-red-50 p-4 rounded-md">
          <h1 className="text-xl font-semibold text-red-600">Error</h1>
          <p>{error?.message || 'Failed to load shop'}</p>
          <Button 
            className="mt-4"
            onClick={() => router.push('/admin/shops')}
          >
            Go Back to Shops
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Edit Shop</h1>
          <p className="text-muted-foreground">ID: {shop.id} | Created: {new Date(shop.createdAt).toLocaleDateString()}</p>
        </div>
        <Button 
          onClick={() => router.push(`/admin/shops/${shop.id}/locations`)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <MapPin size={16} />
          Manage Locations
        </Button>
      </div>
      
      <Separator className="mb-8" />
      
      <ShopForm
        initialData={initialData}
        onSubmit={handleUpdateShop}
        onCancel={handleCancel}
        isLoading={isUpdating}
        onLogoUpload={handleLogoUpload}
        onLogoRemove={handleLogoRemove}
      />
    </div>
  );
} 