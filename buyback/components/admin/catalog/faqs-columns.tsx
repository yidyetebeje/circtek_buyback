"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FAQ } from "@/types/catalog";
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
import { useDeleteFAQ } from "@/hooks/catalog/useFAQs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Action cell component for FAQs
const FAQActionsCell: React.FC<{ row: Row<FAQ> }> = ({ row }) => {
  const faq = row.original;
  const faqId = faq.id;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { mutate: deleteFAQ, isPending: isDeleting } = useDeleteFAQ();

  const handleDelete = () => {
    if (faqId === undefined) return;
    deleteFAQ(faqId, {
      onSuccess: () => {
        toast.success(`FAQ "${faq.question}" deleted successfully.`);
        setIsDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast.error(`Failed to delete FAQ: ${error.message}`);
        setIsDeleteDialogOpen(false);
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Edit Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        asChild
        title="Edit FAQ"
        disabled={faqId === undefined || isDeleting}
      >
        <Link href={`/admin/faqs/${faqId}`}>
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit FAQ</span>
        </Link>
      </Button>

      {/* Delete Button with Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
            title="Delete FAQ"
            disabled={faqId === undefined || isDeleting}
          >
            <Trash className="h-4 w-4" />
            <span className="sr-only">Delete FAQ</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the FAQ
              &ldquo;{faq.question}&rdquo; and all associated data.
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

export const columns: ColumnDef<FAQ>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
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
  },
  {
    accessorKey: "order_no",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Order
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const order = row.getValue("order_no") as number;
      return <span className="font-medium">{order || 0}</span>;
    },
  },
  {
    accessorKey: "question",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Question
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const question = row.getValue("question") as string;
      return (
        <div className="max-w-[300px]">
          <div className="font-medium truncate">{question}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "answer",
    header: "Answer",
    cell: ({ row }) => {
      const answer = row.getValue("answer") as string;
      return (
        <div className="max-w-[400px]">
          <div className="text-sm text-muted-foreground truncate">
            {answer.length > 100 ? `${answer.substring(0, 100)}...` : answer}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "is_published",
    header: "Status",
    cell: ({ row }) => {
      const isPublished = row.getValue("is_published") as boolean;
      return (
        <Badge variant={isPublished ? "default" : "secondary"}>
          {isPublished ? "Published" : "Draft"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string;
      return (
        <div className="text-sm">
          {createdAt ? new Date(createdAt).toLocaleDateString() : "-"}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <FAQActionsCell row={row} />,
  },
]; 