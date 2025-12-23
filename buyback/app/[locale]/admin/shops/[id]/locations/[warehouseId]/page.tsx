"use client";

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { ShopLocationForm, LocationFormValues } from '@/components/admin/catalog/shop-location-form';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useShop } from '@/hooks/catalog/useShops';
import { useWarehouse } from '@/hooks/useWarehouses';
import { useShopLocationByWarehouseId, useUpdateShopLocation, useCreateShopLocation } from '@/hooks/catalog/useShopLocations';
import { ShopLocationFormValues, ShopLocationWithPhones } from '@/types/shop';

export default function EditShopLocationPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = params.id ? parseInt(params.id as string, 10) : null;
  const warehouseId = params.warehouseId ? parseInt(params.warehouseId as string, 10) : null;

  // Use API hooks
  const { data: shopResponse, isLoading: isLoadingShop } = useShop(shopId as number);
  const { data: warehouse, isLoading: isLoadingWarehouse } = useWarehouse(warehouseId as number);
  const { data: locationResponse, isLoading: isLoadingLocation } = useShopLocationByWarehouseId(shopId as number, warehouseId as number);

  // Get data from responses
  const shop = shopResponse?.data;
  const location = locationResponse?.data;
  const locationId = location?.id;

  // We need both create and update hooks depending on whether location exists
  const { mutate: updateLocation, isPending: isUpdating } = useUpdateShopLocation(shopId as number, locationId as number);
  const { mutate: createLocation, isPending: isCreating } = useCreateShopLocation(shopId as number);

  const handleSubmit = async (values: LocationFormValues) => {
    if (!shopId) return;

    if (locationId) {
      // Location exists - update it
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
    } else {
      // No location exists - create one and link it to this warehouse
      createLocation({
        ...values,
        shopId: shopId,
        warehouseId: warehouseId,
      } as any, {
        onSuccess: () => {
          toast.success('Location created successfully!');
          router.push(`/admin/shops/${shopId}/locations`);
        },
        onError: (error) => {
          console.error('Error creating location:', error);
          toast.error(`Failed to create location: ${error.message}`);
        }
      });
    }
  };

  const handleCancel = () => {
    router.push(`/admin/shops/${shopId}/locations`);
  };

  // Transform existing location to form values
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
      warehouseId: location.warehouseId || null,
      phones: location.phones.map((phone) => ({
        id: phone.id,
        phoneNumber: phone.phoneNumber,
        phoneType: phone.phoneType,
        isPrimary: phone.isPrimary
      }))
    };
  };

  // Create initial data from warehouse only (when no location exists)
  const getInitialDataFromWarehouse = (): Partial<ShopLocationFormValues> => {
    return {
      name: warehouse?.name || '',
      description: warehouse?.description || '',
      // Address and other fields are empty - user needs to fill them
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      latitude: 0,
      longitude: 0,
      isActive: true,
      displayOrder: 0,
      warehouseId: warehouseId,
      phones: [{ phoneNumber: '', phoneType: 'main', isPrimary: true }],
    };
  };

  const isLoading = isLoadingShop || isLoadingWarehouse || isLoadingLocation;

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!shop || !warehouse) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-red-50 p-4 rounded-md">
          <h1 className="text-xl font-semibold text-red-600">Error</h1>
          <p>Failed to load shop or warehouse</p>
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

  // If location exists, use its data; otherwise use warehouse data with empty address fields
  const initialData = location
    ? mapLocationToFormValues(location)
    : getInitialDataFromWarehouse();

  const pageTitle = location ? 'Edit Location' : 'Add Location Details';
  const pageSubtitle = location
    ? `Shop: ${shop.name} | Location: ${location.name}`
    : `Shop: ${shop.name} | Warehouse: ${warehouse.name}`;

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
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageSubtitle}</p>
          {!location && (
            <p className="text-sm text-amber-600 mt-1">
              This warehouse needs location details. Please fill in the address information below.
            </p>
          )}
        </div>
      </div>

      <Separator className="mb-8" />

      <ShopLocationForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isUpdating || isCreating}
      />
    </div>
  );
}