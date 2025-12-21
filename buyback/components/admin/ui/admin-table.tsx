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
    <div className={cn("w-full bg-card p-6 md:p-8 rounded-2xl transition-all duration-300 hover:border-border/80", className)}>
      {title && <h3 className="text-xl font-semibold mb-1 text-foreground">{title}</h3>}
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      <div className="rounded-xl border border-border/30 w-full overflow-hidden bg-card">
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
