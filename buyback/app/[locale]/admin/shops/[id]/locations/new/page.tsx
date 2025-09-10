"use client";

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { ShopLocationForm, LocationFormValues } from '@/components/admin/catalog/shop-location-form';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useShop } from '@/hooks/catalog/useShops';
import { useCreateShopLocation } from '@/hooks/catalog/useShopLocations';

export default function CreateShopLocationPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = params.id ? parseInt(params.id as string, 10) : null;
  
  // Use API hooks
  const { data: shopResponse, isLoading, error } = useShop(shopId as number);
  const { mutate: createLocation, isPending: isCreating } = useCreateShopLocation(shopId as number);
  
  // Get shop data from response
  const shop = shopResponse?.data;
  
  const handleCreateLocation = async (values: LocationFormValues) => {
    if (!shopId) return;

    createLocation({
      ...values,
      shopId: shopId,
    }, {
      onSuccess: () => {
        toast.success('Location created successfully!');
        router.push(`/admin/shops/${shopId}/locations`);
      },
      onError: (error) => {
        console.error('Error creating location:', error);
        toast.error(`Failed to create location: ${error.message}`);
      }
    });
  };
  
  const handleCancel = () => {
    router.push(`/admin/shops/${shopId}/locations`);
  };
  
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
      <div className="flex items-center mb-5">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/admin/shops/${shopId}/locations`)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Locations
        </Button>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Add New Location</h1>
          <p className="text-muted-foreground">Create a new physical location for {shop.name}</p>
        </div>
      </div>
      
      <Separator className="mb-8" />
      
      <ShopLocationForm
        onSubmit={handleCreateLocation}
        onCancel={handleCancel}
        isLoading={isCreating}
      />
    </div>
  );
} 