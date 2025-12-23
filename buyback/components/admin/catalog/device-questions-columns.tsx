"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash } from "lucide-react";
import Link from 'next/link';
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from 'next-intl'; // For potential future use

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

import { QuestionSetRow } from "@/types/catalog/device-questions";
import { useDeleteDeviceQuestionSet } from "@/hooks/catalog/useDeviceQuestionSets";

interface QuestionSetActionsCellProps {
  row: Row<QuestionSetRow>;
}

const QuestionSetActionsCell: React.FC<QuestionSetActionsCellProps> = ({ row }) => {
  const t = useTranslations('AdminCatalog'); // Assuming general catalog translations
  const questionSet = row.original;
  const questionSetId = questionSet.id;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { mutate: deleteSet, isPending: isDeleting } = useDeleteDeviceQuestionSet();

  const handleDelete = () => {
    if (!questionSetId) return;
    deleteSet(questionSetId, {
      onSuccess: () => {
        toast.success(t('deviceQuestionSetDeleted', { name: questionSet.displayName }));
        setIsDeleteDialogOpen(false);
      },
      onError: (error: Error) => {
        toast.error(t('errorDeletingDeviceQuestionSet', { message: error.message }));
        setIsDeleteDialogOpen(false);
      },
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Edit Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0"
          asChild
          disabled={isDeleting}
          title={t('edit')}
        >
          <Link href={`/admin/catalog/device-questions/${questionSetId}`}>
            <Pencil className="h-4 w-4" />
            <span className="sr-only">{t('edit')}</span>
          </Link>
        </Button>

        {/* Delete Button with Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
              title={t('delete')}
              disabled={isDeleting}
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">{t('delete')}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteConfirmationDeviceQuestionSet', { name: questionSet.displayName })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                {isDeleting ? t('deleting') : t('continue')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export const columns: ColumnDef<QuestionSetRow>[] = [
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
        className="border-gray-400"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="border-gray-400"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 48,
  },
  {
    accessorKey: "internalName",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Internal Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="whitespace-normal break-words">{row.getValue("internalName")}</div>,
    size: 200,
  },
  {
    accessorKey: "displayName",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Display Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium whitespace-normal break-words">{row.getValue("displayName")}</div>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("description") as string | undefined;
      return <div className="whitespace-normal break-words">{description || "-"}</div>;
    },
    size: 250,
  },

  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Created At
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string | undefined;
      return date ? new Date(date).toLocaleDateString() : "-";
    },
    size: 120,
  },
  {
    id: "actions",
    header: "Actions",
    enableHiding: false,
    cell: ({ row }) => <QuestionSetActionsCell row={row} />,
    size: 80,
  },
]; 