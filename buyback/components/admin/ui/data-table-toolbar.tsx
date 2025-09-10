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
              <Input
                placeholder={
                  searchPlaceholder || `Search by ${searchKey}...`
                }
                value={
                  (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
                }
                onChange={event =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="h-8 w-[150px] lg:w-[250px]"
              />
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