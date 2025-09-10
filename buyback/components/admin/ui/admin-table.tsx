"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdminTableProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * AdminTable - A consistent table wrapper for admin pages
 * 
 * This component provides consistent styling for simple tables in the admin interface.
 * For more complex tables with sorting, filtering, and pagination, use the DataTable component.
 */
export function AdminTable({
  title,
  description,
  children,
  className,
}: AdminTableProps) {
  return (
    <div className={cn("w-full bg-white p-4 rounded-md", className)}>
      {title && <h3 className="text-lg font-medium mb-1">{title}</h3>}
      {description && <p className="text-sm text-muted-foreground mb-3">{description}</p>}
      <div className="rounded-md border w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// Re-export table components for convenience
export {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
};
