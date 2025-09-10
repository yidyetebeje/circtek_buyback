"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminEditCard } from "@/components/admin/AdminEditCard";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { LocationForm, LocationFormValues } from "@/components/admin/locations/location-form";
import { useWarehouse, useUpdateWarehouse } from "@/hooks/useWarehouses";

export default function EditLocationPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id;
  const locationId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId as string, 10);
  
  const { data: location, isLoading: isLoadingLocation, isError, error } = useWarehouse(locationId);
  const { mutate: updateLocation, isPending: isUpdating } = useUpdateWarehouse();
  const envShopId = process.env.NEXT_PUBLIC_SHOP_ID ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : undefined;

  if (isNaN(locationId)) {
    return (
      <div className="w-full py-10 text-red-500 flex justify-center">
        Invalid location ID
      </div>
    );
  }

  if (isLoadingLocation) {
    return (
      <div className="w-full py-10 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <span>Loading data...</span>
        </div>
      </div>
    );
  }

  if (isError || !location) {
    return (
      <div className="w-full py-10 text-red-500 flex justify-center">
        Error loading location: {error?.message || "Location not found"}
      </div>
    );
  }

  const handleSubmit = (values: LocationFormValues) => {
    const payload = {
      warehouseName: values.warehouseName,
      status: values.status,
      shopId: envShopId,
    };

    updateLocation(
      { id: locationId, data: payload },
      {
        onSuccess: () => {
          toast.success("Location updated successfully");
          router.push("/admin/locations");
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to update location");
        },
      }
    );
  };

  // Map warehouse data to form values
  const initialData: Partial<LocationFormValues> = {
    warehouseName: location.name,
    status: location.active,
  };

  return (
    <AdminEditCard
      title="Edit Location"
      description={`Update the details for ${location.name}`}
      breadcrumbs={[
        { href: "/admin/dashboards", label: "Admin" },
        { href: "/admin/locations", label: "Locations" },
        { label: location.name, isCurrentPage: true },
      ]}
    >
      <Separator className="my-6" />
      <LocationForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/admin/locations")}
        isLoading={isUpdating}
      />
    </AdminEditCard>
  );
} 