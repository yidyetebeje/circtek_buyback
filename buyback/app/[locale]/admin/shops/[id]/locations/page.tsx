"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, Trash2, Pencil, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/catalog/data-table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Row, ColumnDef } from "@tanstack/react-table";
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
import { useWarehouses, Warehouse } from "@/hooks/useWarehouses";
import { Badge } from "@/components/ui/badge";

// Define warehouse row type for the table
type WarehouseRow = Warehouse;

export default function ShopLocationsPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = params.id ? parseInt(params.id as string, 10) : null;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<WarehouseRow | null>(null);

  // Get shop details and warehouses from API
  const { data: shopResponse, isLoading: isLoadingShop } = useShop(shopId as number);
  const { data: warehousesResponse, isLoading: isLoadingWarehouses, error } = useWarehouses({ shop_id: shopId as number });

  // Extract data
  const shop = shopResponse?.data;
  const warehouses = warehousesResponse?.data || [];

  const handleCreateNew = () => {
    router.push(`/admin/shops/${shopId}/locations/new`);
  };

  const handleEdit = (warehouse: WarehouseRow) => {
    // Navigate using warehouse ID
    router.push(`/admin/shops/${shopId}/locations/${warehouse.id}`);
  };

  const confirmDelete = (warehouse: WarehouseRow) => {
    setWarehouseToDelete(warehouse);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!warehouseToDelete) return;

    // TODO: Implement delete - this should delete both warehouse and linked location
    toast.error("Delete functionality not yet implemented");
    setIsDeleteDialogOpen(false);
    setWarehouseToDelete(null);
  };

  // Define columns for warehouses
  const warehouseColumns: ColumnDef<WarehouseRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="text-muted-foreground max-w-[300px] truncate">
          {row.getValue("description") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as boolean;
        return (
          <Badge variant={status ? "default" : "secondary"}>
            {status ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }: { row: Row<WarehouseRow> }) => {
        const warehouse = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(warehouse)}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Edit</span>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => confirmDelete(warehouse)}
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
      <div className="flex justify-end mb-5">
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus size={18} />
          Add New Location
        </Button>
      </div>

      <Separator className="mb-8" />

      {error ? (
        <div className="bg-red-50 p-4 rounded-md mb-8">
          <h3 className="text-red-800 font-medium">Error loading warehouses</h3>
          <p className="text-red-700">{error.message}</p>
        </div>
      ) : isLoadingWarehouses ? (
        <div className="flex items-center justify-center py-8">
          <p>Loading warehouses...</p>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-md">
          <Building2 size={48} className="text-gray-300 mb-4" />
          <h3 className="text-xl font-medium mb-2">No locations found</h3>
          <p className="text-muted-foreground mb-6">This shop has no physical locations yet.</p>
          <Button onClick={handleCreateNew}>Add your first location</Button>
        </div>
      ) : (
        <DataTable
          columns={warehouseColumns}
          data={warehouses}
          searchKey="name"
          filterOptions={[
            {
              key: "status",
              label: "Status",
              options: [
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ],
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
              This will permanently delete the location &quot;{warehouseToDelete?.name}&quot; and its linked warehouse.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}