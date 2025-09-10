import * as React from "react"
import { Check, PlusCircle } from "lucide-react"
import { Column } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  /**
   * When true, the filter behaves as a multi-select filter returning an array of values.
   * When false or undefined, the filter behaves as a single-select filter returning a single value.
   */
  multiple?: boolean
  options: {
    label: string
    value: string | number | boolean
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

export function DataTableFacetedFilter<TData, TValue>(
  {
    column,
    title,
    options,
    multiple = false,
  }: DataTableFacetedFilterProps<TData, TValue>
) {
  const facets = column?.getFacetedUniqueValues()

  // Determine currently selected value(s)
  const currentFilterValue = column?.getFilterValue() as
    | string
    | number
    | boolean
    | (string | number | boolean)[]
    | undefined

  const selectedValues = React.useMemo(() => {
    if (multiple) {
      return new Set((currentFilterValue as (string | number | boolean)[]) ?? [])
    }
    return new Set([
      currentFilterValue !== undefined ? (currentFilterValue as string | number | boolean) : undefined,
    ].filter(v => v !== undefined) as (string | number | boolean)[])
  }, [currentFilterValue, multiple])

  const isAnySelected = multiple
    ? selectedValues.size > 0
    : currentFilterValue !== undefined && currentFilterValue !== null

  const handleSelect = (optionValue: string | number | boolean, isSelected: boolean) => {
    if (multiple) {
      const newSelected = new Set(selectedValues)
      if (isSelected) {
        newSelected.delete(optionValue)
      } else {
        newSelected.add(optionValue)
      }
      const filterValues = Array.from(newSelected)
      column?.setFilterValue(filterValues.length ? filterValues : undefined)
    } else {
      column?.setFilterValue(isSelected ? undefined : optionValue)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {isAnySelected && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              {multiple ? (
                <>
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal lg:hidden"
                  >
                    {selectedValues.size}
                  </Badge>
                  <div className="hidden space-x-1 lg:flex">
                    {selectedValues.size > 2 ? (
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal"
                      >
                        {selectedValues.size} selected
                      </Badge>
                    ) : (
                      options
                        .filter(option => selectedValues.has(option.value))
                        .map(option => (
                          <Badge
                            variant="secondary"
                            key={String(option.value)}
                            className="rounded-sm px-1 font-normal"
                          >
                            {option.label}
                          </Badge>
                        ))
                    )}
                  </div>
                </>
              ) : (
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal"
                >
                  {options.find(o => o.value === currentFilterValue)?.label}
                </Badge>
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map(option => {
                const isSelected = multiple
                  ? selectedValues.has(option.value)
                  : currentFilterValue === option.value
                return (
                  <CommandItem
                    key={String(option.value)}
                    onSelect={() => handleSelect(option.value, isSelected)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    {option.icon && (
                      <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{option.label}</span>
                    {facets?.get(option.value) && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {facets.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {isAnySelected && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 