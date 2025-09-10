"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Model } from "@/types/catalog";
import { useDeleteModel } from "@/hooks/catalog/useModels";
import { PublishActionCell } from "./publish-action-cell";
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

// Extended Model type to include relations that might be populated by the API
type ModelWithRelations = Model & {
  brand?: { id: number; title: string };
  category?: { id: number; title: string };
  series?: { id: number; title: string };
};

// Props for ModelActionsCell
interface ModelActionsCellProps {
  row: Row<ModelWithRelations>;
}

// Action cell component for Models
const ModelActionsCell: React.FC<ModelActionsCellProps> = ({ row }) => {
  const model = row.original;
  const modelId = model.id;
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { mutate: deleteModel, isPending: isDeleting } = useDeleteModel();

  const handleDelete = () => {
    if (modelId === undefined) return;
    deleteModel(modelId, {
      onSuccess: () => {
        toast.success(`Model "${model.title}" deleted successfully.`);
        setIsDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast.error(`Failed to delete model: ${error.message}`);
        setIsDeleteDialogOpen(false);
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Publish Button */}
      {modelId !== undefined && (
        <PublishActionCell
          entityId={modelId}
          entityName={model.title}
          entityType="model"
          publishedInShops={model.publishedInShops || []}
        />
      )}

      {/* Edit Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        onClick={() => modelId !== undefined && router.push(`/admin/catalog/models/${modelId}`)}
        title="Edit Model"
        disabled={modelId === undefined || isDeleting}
      >
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit Model</span>
      </Button>

      {/* Delete Button with Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
            title="Delete Model"
            disabled={modelId === undefined || isDeleting}
          >
            <Trash className="h-4 w-4" />
            <span className="sr-only">Delete Model</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the model
              &ldquo;{model.title}&rdquo; and all associated data.
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
export function useColumns(): ColumnDef<ModelWithRelations>[] {
  // Get current user session to check role
  const { data: session } = useSession();
  const isShopManager = session?.user?.roleSlug === 'shop_manager';

  const columns: ColumnDef<ModelWithRelations>[] = [
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
      const imageUrl = row.original?.model_image;
      return (
        <div className="relative h-24 w-24 rounded-md overflow-hidden border border-border">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={row.original?.title || 'Model'}
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
    accessorKey: "title",
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
    cell: ({ row }) => <div className="font-medium max-w-[250px] whitespace-normal break-all">{row.getValue("title")}</div>,
  },
  {
    accessorKey: "base_price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Base Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const basePrice = row.original?.base_price;
      const formattedPrice = basePrice 
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(basePrice) 
        : 'N/A';
      return <div className="text-right font-medium">{formattedPrice}</div>;
    },
  },
  {
    id: "brand_id",
    accessorFn: (row) => row.brand?.id?.toString(),
    header: "Brand",
    cell: ({ row }) => {
      const brandTitle = row.original?.brand?.title || 'N/A'; 
      return <div className="max-w-[150px] whitespace-normal break-all">{brandTitle}</div>;
    },
    enableColumnFilter: true,
    filterFn: "equals",
  },
  {
    id: "series_id",
    accessorFn: (row) => row.series?.id?.toString(),
    header: "Series",
    cell: ({ row }) => {
      const seriesTitle = row.original?.series?.title || 'N/A';
      return <div className="max-w-[150px] whitespace-normal break-all">{seriesTitle}</div>;
    },
    enableColumnFilter: true,
    filterFn: "equals",
  },
  {
    id: "category_id",
    accessorFn: (row) => row.category?.id?.toString(),
    header: "Category",
    cell: ({ row }) => {
      const categoryTitle = row.original?.category?.title || 'N/A';
      return <div className="max-w-[150px] whitespace-normal break-all">{categoryTitle}</div>;
    },
    enableColumnFilter: true,
    filterFn: "equals",
  },
  // Only include Published In Shops column for non-shop managers
  ...(!isShopManager ? [{
    id: "published_shops",
    header: "Published In Shops",
    cell: ({ row }: { row: Row<ModelWithRelations> }) => {
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
    cell: ({ row }) => <ModelActionsCell row={row} />,
  },
  ];
  
  return columns;
}

// Export default columns for backward compatibility
export const columns: ColumnDef<ModelWithRelations>[] = [];
