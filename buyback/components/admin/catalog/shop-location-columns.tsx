import { ColumnDef } from "@tanstack/react-table";
import { ShopLocationWithPhones } from "@/types/shop";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Simple date formatter
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Type for the table
export type ShopLocationRow = ShopLocationWithPhones;

// Define columns for the shop locations table
export const shopLocationColumns: ColumnDef<ShopLocationRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => {
      const location = row.original;
      return (
        <div className="max-w-[300px] truncate">
          {location.address}, {location.city}, {location.country}
        </div>
      );
    },
  },
  {
    accessorKey: "phones",
    header: "Phone(s)",
    cell: ({ row }) => {
      const phones = row.original.phones || [];
      
      if (phones.length === 0) {
        return <span className="text-muted-foreground">No phone numbers</span>;
      }

      if (phones.length === 1) {
        return <span>{phones[0].phoneNumber}</span>;
      }

      const primaryPhone = phones.find(p => p.isPrimary) || phones[0];
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-pointer">
                <span>{primaryPhone.phoneNumber}</span>
                <Badge variant="outline" className="ml-1">{phones.length}</Badge>
                <Phone size={14} className="text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="p-1">
                {phones.map((phone, index) => (
                  <div key={phone.id || index} className="flex items-center gap-2">
                    <span>{phone.phoneNumber}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      ({phone.phoneType}{phone.isPrimary ? ", primary" : ""})
                    </span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "coordinates",
    header: "Coordinates",
    cell: ({ row }) => {
      const location = row.original;
      return (
        <div className="text-sm font-mono">
          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");
      return isActive ? (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>
      ) : (
        <Badge variant="destructive">Inactive</Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string;
      return <div className="text-sm">{formatDate(date)}</div>;
    },
  },
]; 