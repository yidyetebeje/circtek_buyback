"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, Trash2, Pencil, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/catalog/data-table";
import { shopLocationColumns, ShopLocationRow } from "@/components/admin/catalog/shop-location-columns";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Row } from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useShop } from "@/hooks/catalog/useShops";
import { useShopLocations, useDeleteShopLocation, useToggleShopLocationActive } from "@/hooks/catalog/useShopLocations";
import { ShopLocationWithPhones } from "@/types/shop";

export default function ShopLocationsPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = params.id ? parseInt(params.id as string, 10) : null;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<ShopLocationRow | null>(null);
  
  // Get shop details and locations from API
  const { data: shopResponse, isLoading: isLoadingShop } = useShop(shopId as number);
  const { data: locationsResponse, isLoading: isLoadingLocations, error } = useShopLocations(shopId as number);
  
  const { mutate: deleteLocation, isPending: isDeleting } = useDeleteShopLocation(shopId as number);
  const { mutate: toggleActive, isPending: isToggling } = useToggleShopLocationActive(shopId as number, 0); // We'll update the locationId when needed
  
  // Extract data
  const shop = shopResponse?.data;
  const locations = locationsResponse?.data || [];

  const handleCreateNew = () => {
    router.push(`/admin/shops/${shopId}/locations/new`);
  };

  const handleEdit = (location: ShopLocationRow) => {
    router.push(`/admin/shops/${shopId}/locations/${location.id}`);
  };

  const confirmDelete = (location: ShopLocationRow) => {
    setLocationToDelete(location);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;
    
    deleteLocation(locationToDelete.id, {
      onSuccess: () => {
        toast.success(`Location "${locationToDelete.name}" deleted successfully`);
        setIsDeleteDialogOpen(false);
        setLocationToDelete(null);
      },
      onError: (error) => {
        console.error('Error deleting location:', error);
        toast.error(`Failed to delete location: ${error.message}`);
      }
    });
  };

  const handleToggleActive = (location: ShopLocationRow) => {
    toggleActive(undefined, {
      onSuccess: (data: unknown) => {
        // Cast the data to the expected type
        const response = data as { data: ShopLocationWithPhones };
        const newStatus = response.data.isActive;
        toast.success(`Location "${location.name}" ${newStatus ? 'activated' : 'deactivated'} successfully`);
      },
      onError: (error) => {
        console.error('Error toggling location status:', error);
        toast.error(`Failed to update location status: ${error.message}`);
      }
    });
  };

  // Create a custom columns definition that includes actions
  const columnsWithActions = [
    ...shopLocationColumns.slice(0, -1), // Keep all columns except the last one
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }: { row: Row<ShopLocationRow> }) => {
        const location = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(location)}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Edit</span>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleActive(location)}
              className={`h-8 w-8 p-0 ${location.isActive ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50' : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
              disabled={isToggling}
            >
              <span className="sr-only">{location.isActive ? 'Deactivate' : 'Activate'}</span>
              {location.isActive ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => confirmDelete(location)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <span className="sr-only">Delete</span>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-5">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/admin/shops/${shopId}`)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shop
        </Button>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{isLoadingShop ? 'Loading...' : `${shop?.name || 'Shop'} - Locations`}</h1>
          <p className="text-muted-foreground">Manage shop physical locations</p>
        </div>
        
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus size={18} />
          Add New Location
        </Button>
      </div>
      
      <Separator className="mb-8" />
      
      {error ? (
        <div className="bg-red-50 p-4 rounded-md mb-8">
          <h3 className="text-red-800 font-medium">Error loading locations</h3>
          <p className="text-red-700">{error.message}</p>
        </div>
      ) : isLoadingLocations ? (
        <div className="flex items-center justify-center py-8">
          <p>Loading locations...</p>
        </div>
      ) : locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-md">
          <MapPin size={48} className="text-gray-300 mb-4" />
          <h3 className="text-xl font-medium mb-2">No locations found</h3>
          <p className="text-muted-foreground mb-6">This shop has no physical locations yet.</p>
          <Button onClick={handleCreateNew}>Add your first location</Button>
        </div>
      ) : (
        <DataTable 
          columns={columnsWithActions} 
          data={locations}
          searchKey="name"
          filterOptions={[
            {
              key: "isActive",
              label: "Status",
              options: [
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ],
            },
            {
              key: "country",
              label: "Country",
              options: Array.from(new Set(locations.map((loc: ShopLocationRow) => loc.country)))
                .map(country => ({ label: country as string, value: country as string })),
            },
          ]}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the location &quot;{locationToDelete?.name}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 