"use client"

import { Table } from "@tanstack/react-table"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { DataTableViewOptions } from "./data-table-view-options"
import { Input } from "@/components/ui/input"
import React from "react"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchKey?: string
  searchPlaceholder?: string
  filterOptions?: {
    key: string
    label: string
    /**
     * When true, the filter acts as a multi-select filter. Defaults to single-select.
     */
    multiple?: boolean
    options: {
      label: string
      value: string | number | boolean
      icon?: React.ComponentType<{ className?: string }>
    }[]
  }[]
  bulkAction?: React.ReactNode
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder,
  filterOptions = [],
  bulkAction,
}: DataTableToolbarProps<TData>) {
  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {selectedRowCount > 0 && bulkAction ? (
          <>{bulkAction}</>
        ) : (
          <>
            {searchKey && (
              <div className="relative bg-card rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-primary">
                    <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.061l-2.755-2.755ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
                  </svg>
                </div>
                <Input
                  placeholder={searchPlaceholder || `Search by ${searchKey}...`}
                  value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                  onChange={event => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
                  className="h-9 w-[200px] lg:w-[300px] pl-10 pr-10 rounded-xl border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/50"
                />
                {(table.getColumn(searchKey)?.getFilterValue() as string) && (
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/60 hover:text-primary transition-colors z-10"
                    aria-label="Clear search"
                    onClick={() => table.getColumn(searchKey)?.setFilterValue("")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            {filterOptions.map(option => {
              const column = table.getColumn(option.key)
              if (column) {
                return (
                  <DataTableFacetedFilter
                    key={option.key}
                    column={column}
                    title={option.label}
                    options={option.options}
                    multiple={option.multiple}
                  />
                )
              }
              return null
            })}
          </>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
} 