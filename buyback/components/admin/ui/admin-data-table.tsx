"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DataTable,
  DataTableProps
} from "@/components/admin/catalog/data-table";

// Local type matching the PublishedShop structure expected by DataTable
type PublishedShop = { shop_id: number };

interface AdminDataTableProps<TData extends { id?: string | number; publishedInShops?: PublishedShop[] }, TValue> extends DataTableProps<TData, TValue> {
  title?: string;
  description?: string;
  wrapperClassName?: string;
}

/**
 * AdminDataTable - A consistent DataTable wrapper for admin pages
 * 
 * This component extends the existing DataTable by adding consistent styling and
 * an optional title and description. It maintains all the existing DataTable functionality.
 */
export function AdminDataTable<TData extends { id?: string | number; publishedInShops?: PublishedShop[] }, TValue>({
  title,
  description,
  wrapperClassName,
  ...props
}: AdminDataTableProps<TData, TValue>) {
  return (
    <div className={cn("flex flex-col gap-6", wrapperClassName)}>
      {title && <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>}
      {description && <p className="text-muted-foreground">{description}</p>}
      <DataTable {...props} />
    </div>
  );
}

// Re-export DataTable for convenience
export { DataTable };
