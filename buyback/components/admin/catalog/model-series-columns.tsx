"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { ModelSeries } from '@/types/catalog';
import { useDeleteModelSeries } from "@/hooks/catalog/useModelSeries";
import { PublishActionCell } from "./publish-action-cell";

// Extended ModelSeries type to include relations that might be populated by the API
type ModelSeriesWithRelations = ModelSeries & {
  brand?: { id: number; title: string };
};

// Props for ModelSeriesActionsCell
interface ModelSeriesActionsCellProps {
  row: Row<ModelSeriesWithRelations>;
}

// Action cell component for Model Series
const ModelSeriesActionsCell: React.FC<ModelSeriesActionsCellProps> = ({ row }) => {
  const modelSeries = row.original;
  const modelSeriesId = modelSeries.id;
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { mutate: deleteModelSeries, isPending: isDeleting } = useDeleteModelSeries();

  const handleDelete = () => {
    if (modelSeriesId === undefined) return;
    deleteModelSeries(modelSeriesId, {
      onSuccess: () => {
        toast.success(`Model Series "${modelSeries.title}" deleted successfully.`);
        setIsDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast.error(`Failed to delete model series: ${error.message}`);
        setIsDeleteDialogOpen(false);
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Publish Button */}
      {modelSeriesId !== undefined && (
        <PublishActionCell
          entityId={modelSeriesId}
          entityName={modelSeries.title}
          entityType="model-series"
          publishedInShops={modelSeries.publishedInShops || []}
        />
      )}

      {/* Edit Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        onClick={() => modelSeriesId !== undefined && router.push(`/admin/catalog/model-series/${modelSeriesId}`)}
        title="Edit Series"
        disabled={modelSeriesId === undefined || isDeleting}
      >
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit Series</span>
      </Button>

      {/* Delete Button with Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
            title="Delete Series"
            disabled={modelSeriesId === undefined || isDeleting}
          >
            <Trash className="h-4 w-4" />
            <span className="sr-only">Delete Series</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the model series
              &ldquo;{modelSeries.title}&rdquo; and all associated data (including linked models).
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

// Custom hook to get columns based on user role
export function useColumns(): ColumnDef<ModelSeriesWithRelations>[] {
  // Get current user session to check role
  const { data: session } = useSession();
  const isShopManager = session?.user?.roleSlug === 'shop_manager';

  const columns: ColumnDef<ModelSeriesWithRelations>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: boolean | "indeterminate") => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 48,
  },
  {
    id: "image",
    header: "Image", 
    cell: ({ row }) => {
      const imageUrl = row.original?.image;
      return (
        <div className="relative h-24 w-24 rounded-md overflow-hidden border border-border">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={row.original?.title || 'Series image'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center text-muted-foreground text-xs">No image</div>
          )}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "title", // Using 'title' as the field name to match our data model
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue("title")}</div>,
  },
  {
    id: "brand_id",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Brand
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    accessorFn: (row: ModelSeriesWithRelations) => row.brand?.id,
    cell: ({ row }) => <div className="font-medium">{row.original.brand?.title ?? 'N/A'}</div>,
  },
  // Only include Published In Shops column for non-shop managers
  ...(!isShopManager ? [{
    id: "published_shops",
    header: "Published In Shops",
    cell: ({ row }: { row: Row<ModelSeriesWithRelations> }) => {
      const publishedShops = row.original.publishedInShops || [];
      return (
        <div className="flex items-center">
          {publishedShops.length > 0 ? (
            <div className="bg-green-50 text-green-700 rounded-full px-2 py-0.5 text-xs font-medium">
              {publishedShops.length} shop{publishedShops.length !== 1 ? 's' : ''}
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">Not published</div>
          )}
        </div>
      );
    },
  }] : []),
  {
    id: "actions",
    header: "Actions",
    enableHiding: false,
    cell: ({ row }) => <ModelSeriesActionsCell row={row} />,
  },
  ];
  
  return columns;
}

// Export default columns for backward compatibility
export const columns: ColumnDef<ModelSeriesWithRelations>[] = [];
