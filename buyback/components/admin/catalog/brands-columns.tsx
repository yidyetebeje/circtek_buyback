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
import { Brand } from '@/types/catalog';
import { useDeleteBrand } from "@/hooks/catalog/useBrands";
import { PublishActionCell } from "./publish-action-cell";

// Define a type for the props expected by BrandActionsCell
interface BrandActionsCellProps {
  row: Row<Brand>;
}

// Create a separate component for the actions cell content
const BrandActionsCell: React.FC<BrandActionsCellProps> = ({ row }) => {
  const brand = row.original;
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { mutate: deleteBrand, isPending: isDeleting } = useDeleteBrand();

  const handleDelete = () => {
    if (!brand.id) return;
    deleteBrand(brand.id, {
      onSuccess: () => {
        toast.success(`Brand "${brand.title}" deleted successfully.`);
        setIsDeleteDialogOpen(false);
      },
      onError: (error: Error | { response?: { data?: { error?: string } } }) => {
        // Extract error message from different possible error structures
        let errorMessage = 'An Error Occurred';
        if ('response' in error && error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if ('message' in error && error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        toast.error(`Failed to delete brand: ${errorMessage}`);
        setIsDeleteDialogOpen(false);
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Publish Button */}
      {brand.id && (
        <PublishActionCell
          entityId={brand.id}
          entityName={brand.title}
          entityType="brand"
          publishedInShops={brand.publishedInShops || []}
        />
      )}

      {/* Edit Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        onClick={() => brand.id && router.push(`/admin/catalog/brands/${brand.id}`)}
        title="Edit Brand"
        disabled={!brand.id || isDeleting}
      >
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit Brand</span>
      </Button>

      {/* Delete Button with Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
            title="Delete Brand"
            disabled={!brand.id || isDeleting}
          >
            <Trash className="h-4 w-4" />
            <span className="sr-only">Delete Brand</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the brand
              &ldquo;{brand.title}&rdquo; and all associated data.
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

// Create a custom hook to get columns based on user role
export function useColumns(): ColumnDef<Brand>[] {
  // Get current user session to check role
  const { data: session } = useSession();
  const isShopManager = session?.user?.roleSlug === 'shop_manager';
  
  // Define the base columns that are always included
  const baseColumns: ColumnDef<Brand>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },
    {
      id: "logo",
      header: "Logo", 
      cell: ({ row }) => {
        const logoUrl = row.original?.icon;
        return (
          <div className="relative h-24 w-24 rounded-md overflow-hidden border border-border">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={row.original?.title || 'Brand logo'}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="h-full w-full bg-muted flex items-center justify-center text-muted-foreground text-xs">No logo</div>
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
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div className="lowercase">{row.getValue("title")}</div>,
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => <BrandActionsCell row={row} />,
    },
  ];
  
  // If user is not a shop manager, include the Published In Shops column
  if (!isShopManager) {
    // Insert the Published In Shops column before the actions column
    baseColumns.splice(3, 0, {
      id: "published_shops",
      header: "Published In Shops",
      cell: ({ row }: { row: Row<Brand> }) => {
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
    });
  }
  
  return baseColumns;
}

// For backward compatibility, export an empty array that components can import
// The actual implementation will use the useColumns hook
export const columns: ColumnDef<Brand>[] = [];
