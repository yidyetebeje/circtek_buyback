"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Check, Trash, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { featuredDeviceService } from "@/lib/api";

// Define type for featured device with relations
export type FeaturedDevice = {
  id: number;
  modelId: number;
  shopId: number;
  clientId?: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  model?: {
    id: number;
    title: string;
    brand_id: number;
    model_image?: string | null;
    base_price?: number | null;
    sef_url: string;
    brand?: {
      id: number;
      title: string;
    }
  };
  shop?: {
    id: number;
    name: string;
    logo?: string | null;
    organization?: string | null;
    phone?: string | null;
  }
};

// Toggle featured device publish status (Note: Consider replacing window.location.reload with state update/refetch)
async function togglePublishStatus(id: number, currentStatus: boolean): Promise<void> {
  try {
    await featuredDeviceService.updateFeaturedDevice(id, {
      isPublished: !currentStatus
    });
    
    toast.success(`Device ${!currentStatus ? "published" : "unpublished"} successfully`);
    return Promise.resolve();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    return Promise.reject(error);
  }
}

// Delete featured device (Note: Consider replacing window.location.reload with state update/refetch)
async function deleteFeaturedDevice(id: number): Promise<void> {
  try {
    await featuredDeviceService.deleteFeaturedDevice(id);
    toast.success("Featured device deleted successfully");
    return Promise.resolve();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    return Promise.reject(error);
  }
}

import { Row } from "@tanstack/react-table";

// Props for FeaturedDeviceActionsCell
interface FeaturedDeviceActionsCellProps {
  row: Row<FeaturedDevice>;
}

// Action cell component for Featured Devices
const FeaturedDeviceActionsCell: React.FC<FeaturedDeviceActionsCellProps> = ({ row }) => {
  const featuredDevice = row.original as FeaturedDevice;
  const featuredDeviceId = featuredDevice.id;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTogglePublish = async () => {
    if (featuredDeviceId === undefined) return;
    setIsPublishing(true);
    try {
      await togglePublishStatus(featuredDeviceId, featuredDevice.isPublished);
      // Consider using queryClient.invalidateQueries or a callback for data refresh
      // instead of window.location.reload() for better UX.
      window.location.reload();
    } catch {
      // Error is already toasted in togglePublishStatus
    }
    setIsPublishing(false);
  };

  const handleDelete = async () => {
    if (featuredDeviceId === undefined) return;
    setIsDeleting(true);
    try {
      await deleteFeaturedDevice(featuredDeviceId);
      // Consider using queryClient.invalidateQueries or a callback for data refresh
      // instead of window.location.reload() for better UX.
      setIsDeleteDialogOpen(false);
      window.location.reload();
    } catch {
      // Error is already toasted in deleteFeaturedDevice
    }
    setIsDeleting(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Publish/Unpublish Button */}
      {featuredDeviceId !== undefined && (
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 p-0 ${featuredDevice.isPublished ? "text-green-600 hover:text-red-600 hover:bg-red-50" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}
          onClick={handleTogglePublish}
          title={featuredDevice.isPublished ? "Unpublish" : "Publish"}
          disabled={isPublishing || isDeleting}
        >
          {isPublishing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : featuredDevice.isPublished ? (
            <Check className="h-4 w-4" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          <span className="sr-only">{featuredDevice.isPublished ? "Unpublish" : "Publish"}</span>
        </Button>
      )}

      {/* Delete Button with Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
            title="Delete Featured Device"
            disabled={featuredDeviceId === undefined || isPublishing || isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
            <span className="sr-only">Delete Featured Device</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the featured device
              (Model: {featuredDevice.model?.title || 'N/A'}, Shop: {featuredDevice.shop?.name || 'N/A'}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const columns: ColumnDef<FeaturedDevice>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    id: "model.title",
    accessorFn: (row) => row.model?.title,
    header: "Model",
    cell: ({ row }) => {
      const model = row.original.model;
      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {model?.model_image && (
              <div className="h-8 w-8 rounded overflow-hidden flex-shrink-0">
                <img 
                  src={model.model_image} 
                  alt={model.title || ""}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <span className="font-medium">{model?.title || "—"}</span>
          </div>
          {model?.base_price && (
            <span className="text-xs text-muted-foreground mt-1">
              Base price: ${model.base_price.toFixed(2)}
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "shop.name",
    accessorFn: (row) => row.shop?.name,
    header: "Shop",
    cell: ({ row }) => {
      const shop = row.original.shop;
      return (
        <div className="flex items-center gap-2">
          {shop?.logo && (
            <div className="h-7 w-7 rounded-full overflow-hidden flex-shrink-0">
              <img 
                src={shop.logo} 
                alt={shop.name || "Shop logo"}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col">
            <span>{shop?.name || "—"}</span>
            {shop?.organization && (
              <span className="text-xs text-muted-foreground">{shop.organization}</span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      return format(new Date(row.original.createdAt), "PPP");
    },
  },
  {
    id: "actions",
    header: "Actions",
    enableHiding: false,
    cell: ({ row }) => <FeaturedDeviceActionsCell row={row} />,
  },
];
