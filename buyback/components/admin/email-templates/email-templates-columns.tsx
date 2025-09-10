"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Pencil, Trash } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { EmailTemplate } from "@/types/emailTemplates"
import { useDeleteEmailTemplate } from "@/hooks/useEmailTemplates"
import Link from "next/link"
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
} from "@/components/ui/alert-dialog"

const EMAIL_TEMPLATE_TYPES = {
    ORDER_CONFIRMATION: "Order Confirmation",
    SHIPMENT_RECEIVED: "Shipment Received",
    INSPECTION_COMPLETED: "Inspection Completed",
    OFFER_ACCEPTED: "Offer Accepted",
    OFFER_REJECTED: "Offer Rejected",
    ORDER_COMPLETED: "Order Completed",
    ORDER_CANCELLED: "Order Cancelled",
    CUSTOM: "Custom"
};

const ActionsCell = ({ row }: { row: { original: EmailTemplate } }) => {
    const { mutate: deleteTemplate, isPending } = useDeleteEmailTemplate();
  
    const handleDelete = () => {
      deleteTemplate(row.original.id, {
        onSuccess: () => toast.success("Template deleted"),
        onError: (err) => toast.error(err.message),
      });
    };
  
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/email-templates/${row.original.id}`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700"
              disabled={isPending}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the email template.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                {isPending ? "Deleting..." : "Continue"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
};

export const columns: ColumnDef<EmailTemplate>[] = [
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
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "subject",
      header: "Subject",
    },
    {
      accessorKey: "templateType",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("templateType") as keyof typeof EMAIL_TEMPLATE_TYPES
        return (
            <Badge variant="outline">{EMAIL_TEMPLATE_TYPES[type] || type}</Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
            const isActive = row.getValue("isActive");
            return <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        }
    },
    {
        accessorKey: "updatedAt",
        header: "Last Updated",
        cell: ({row}) => new Date(row.getValue("updatedAt")).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ActionsCell,
    },
] 