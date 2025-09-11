"use client";

import { ColumnDef, Column, Row } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash } from "lucide-react";
import Link from 'next/link'; // Import Link
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { useState } from "react"; // Import useState
import { toast } from "sonner"; // Import toast
import { useSession } from "next-auth/react"; // Import useSession

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
} from "@/components/ui/alert-dialog"; // Import AlertDialog

import { Category } from "@/types/catalog";
import { useDeleteCategory } from "@/hooks/catalog/useCategories"; // Import delete hook
import { PublishActionCell } from "./publish-action-cell";

// Define props for the action cell component
interface CategoryActionsCellProps {
  row: Row<Category>;
}

// Action cell component
const CategoryActionsCell: React.FC<CategoryActionsCellProps> = ({ row }) => {
  const category = row.original;
  const categoryId = category.id;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();

  const handleDelete = () => {
    if (categoryId === undefined) return;
    deleteCategory(categoryId, {
      onSuccess: () => {
        toast.success(`Category "${category.title}" deleted successfully.`);
        setIsDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast.error(`Failed to delete category: ${error.message}`);
        setIsDeleteDialogOpen(false);
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Publish Button */}
      {categoryId !== undefined && (
        <PublishActionCell
          entityId={categoryId}
          entityName={category.title}
          entityType="category"
          publishedInShops={category.publishedInShops || []}
        />
      )}

      {/* Edit Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        asChild
        disabled={categoryId === undefined || isDeleting} // Disable if deleting
        title="Edit Category"
      >
        <Link href={categoryId !== undefined ? `/admin/catalog/categories/${categoryId}` : '#'}>
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit Category</span>
        </Link>
      </Button>

      {/* Delete Button with Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
            title="Delete Category"
            disabled={categoryId === undefined || isDeleting}
          >
            <Trash className="h-4 w-4" />
            <span className="sr-only">Delete Category</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category
              &ldquo;{category.title}&rdquo; and all associated data.
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
export function useColumns(): ColumnDef<Category>[] {
  // Get current user session to check role
  const { data: session } = useSession();
  const isShopManager = session?.user?.roleSlug === 'shop_manager';

  const columns: ColumnDef<Category>[] = [
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
    id: "icon",
    header: "Icon", 
    cell: ({ row }) => {
      const iconUrl = row.original?.icon;
      return (
        <div className="relative h-24 w-24 rounded-md overflow-hidden border border-border">
          {iconUrl ? (
            <img 
              src={iconUrl} 
              alt={row.original?.title || 'Category icon'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center text-muted-foreground text-xs">No icon</div>
          )}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "title",
    header: ({ column }: { column: Column<Category, unknown> }) => {
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
    cell: ({ row }: { row: Row<Category> }) => (
      <div className="max-w-[250px] truncate whitespace-nowrap">{row.getValue("title")}</div>
    ),
    size: 260,
  },
  // Only include Published In Shops column for non-shop managers
  ...(!isShopManager ? [{
    id: "published_shops",
    header: "Published In Shops",
    cell: ({ row }: { row: Row<Category> }) => {
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
    accessorKey: "usage",
    header: "Usage",
  },
  {
    id: "actions",
    header: "Actions",
    enableHiding: false,
    cell: ({ row }: { row: Row<Category> }) => <CategoryActionsCell row={row} />, // Use the component
  },
  ];
  
  return columns;
}

// Export default columns for backward compatibility
export const columns: ColumnDef<Category>[] = [];
