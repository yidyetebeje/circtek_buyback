"use client";

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { ShopLocationForm, LocationFormValues } from '@/components/admin/catalog/shop-location-form';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useShop } from '@/hooks/catalog/useShops';
import { useShopLocation, useUpdateShopLocation } from '@/hooks/catalog/useShopLocations';
import { ShopLocationFormValues, ShopLocationWithPhones } from '@/types/shop';

export default function EditShopLocationPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = params.id ? parseInt(params.id as string, 10) : null;
  const locationId = params.locationId ? parseInt(params.locationId as string, 10) : null;
  
  // Use API hooks
  const { data: shopResponse, isLoading: isLoadingShop } = useShop(shopId as number);
  const { data: locationResponse, isLoading: isLoadingLocation, error } = useShopLocation(shopId as number, locationId as number);
  const { mutate: updateLocation, isPending: isUpdating } = useUpdateShopLocation(shopId as number, locationId as number);
  
  // Get data from responses
  const shop = shopResponse?.data;
  const location = locationResponse?.data;
  
  const handleUpdateLocation = async (values: LocationFormValues) => {
    if (!shopId || !locationId) return;

    updateLocation(values, {
      onSuccess: () => {
        toast.success('Location updated successfully!');
        router.push(`/admin/shops/${shopId}/locations`);
      },
      onError: (error) => {
        console.error('Error updating location:', error);
        toast.error(`Failed to update location: ${error.message}`);
      }
    });
  };
  
  const handleCancel = () => {
    router.push(`/admin/shops/${shopId}/locations`);
  };
  
  // Transform the API response to match the form's expected format
  const mapLocationToFormValues = (location: ShopLocationWithPhones): ShopLocationFormValues => {
    return {
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state || '',
      postalCode: location.postalCode || '',
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      description: location.description || '',
      operatingHours: location.operatingHours || null,
      isActive: location.isActive,
      displayOrder: location.displayOrder,
      phones: location.phones.map((phone) => ({
        id: phone.id,
        phoneNumber: phone.phoneNumber,
        phoneType: phone.phoneType,
        isPrimary: phone.isPrimary
      }))
    };
  };
  
  const isLoading = isLoadingShop || isLoadingLocation;
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg">Loading location details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !location || !shop) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-red-50 p-4 rounded-md">
          <h1 className="text-xl font-semibold text-red-600">Error</h1>
          <p>{error?.message || 'Failed to load location'}</p>
          <Button 
            className="mt-4"
            onClick={() => router.push(`/admin/shops/${shopId}/locations`)}
          >
            Go Back to Locations
          </Button>
        </div>
      </div>
    );
  }

  // Form initial data from the location object
  const initialData = mapLocationToFormValues(location);

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
          <h1 className="text-2xl font-bold">Edit Location</h1>
          <p className="text-muted-foreground">
            Shop: {shop.name} | Location: {location.name}
          </p>
        </div>
      </div>
      
      <Separator className="mb-8" />
      
      <ShopLocationForm
        initialData={initialData}
        onSubmit={handleUpdateLocation}
        onCancel={handleCancel}
        isLoading={isUpdating}
      />
    </div>
  );
} 