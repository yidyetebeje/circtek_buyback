"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminEditCard } from "@/components/admin/AdminEditCard";
import { Separator } from "@/components/ui/separator";
import {
  LocationForm,
  LocationFormValues,
} from "@/components/admin/locations/location-form";
import { useCreateWarehouse } from "@/hooks/useWarehouses";

export default function NewLocationPage() {
  const router = useRouter();
  const { mutate: createLocation, isPending: isCreating } =
    useCreateWarehouse();
  const envShopId = process.env.NEXT_PUBLIC_SHOP_ID ? parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : undefined;

  const handleSubmit = (values: LocationFormValues) => {
    createLocation(
      {
        warehouseName: values.warehouseName,
        status: values.status,
        shopId: envShopId,
      },
      {
        onSuccess: () => {
          toast.success("Location created successfully.");
          router.push("/admin/locations");
        },
        onError: (error) => {
          toast.error(
            `Failed to create location: ${error.message || "Unknown error"}`
          );
        },
      }
    );
  };

  return (
    <AdminEditCard
      title="Create New Location"
      description="Fill in the details for the new location."
      breadcrumbs={[
        { href: "/admin/dashboards", label: "Admin" },
        { href: "/admin/locations", label: "Locations" },
        { label: "Create New", isCurrentPage: true },
      ]}
    >
      <Separator className="my-6" />
      <LocationForm
        onSubmit={handleSubmit}
        onCancel={() => router.push("/admin/locations")}
        isLoading={isCreating}
      />
    </AdminEditCard>
  );
} 