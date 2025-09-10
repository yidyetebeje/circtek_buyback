import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Check, PlusCircle, RefreshCw, X } from 'lucide-react';

// Define the shape of filter options
interface FilterOption {
  value: number;
  label: string;
}

// Define the shape of the active filters state
interface ActiveFiltersState {
  category?: FilterOption[];
  brand?: FilterOption[];
  series?: FilterOption[];
}

// Define the shape of the filters state passed to the API
interface FiltersState {
  category_id?: number[];
  brand_id?: number[];
  series_id?: number[];
  title?: string;
}

// Define props for the component
interface ModelFilterToolbarProps {
  isLoading: boolean;
  isSearching: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FiltersState;
  activeFilters: ActiveFiltersState;
  categoryOptions: FilterOption[];
  brandOptions: FilterOption[];
  seriesOptions: FilterOption[];
  onFilterSelect: (filterKey: 'category_id' | 'brand_id' | 'series_id', option: FilterOption) => void;
  onClearAllFilters: () => void;
  onRemoveFilter: (filterKey: 'category' | 'brand' | 'series', value: number) => void;
  onClearSearch: () => void;
}

export const ModelFilterToolbar: React.FC<ModelFilterToolbarProps> = ({
  isLoading,
  isSearching,
  searchValue,
  onSearchChange,
  filters,
  activeFilters,
  categoryOptions,
  brandOptions,
  seriesOptions,
  onFilterSelect,
  onClearAllFilters,
  onRemoveFilter,
  onClearSearch
}) => {

  const [openFilters, setOpenFilters] = React.useState({
    category: false,
    brand: false,
    series: false,
  });

  const totalActiveFilters = (activeFilters.category?.length || 0) +
                             (activeFilters.brand?.length || 0) +
                             (activeFilters.series?.length || 0);

  return (
    <div className="">
      <div className="flex flex-wrap gap-3  items-center mb-3">
        {/* Search Input */}
        <div className="min-w-[250px]">
          <div className="relative">
            <Input
              placeholder="Search models by title..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-4 h-9 w-96" // Adjusted padding and height
            />
            {(isLoading || isSearching) && filters.title ? (
              <RefreshCw className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <Popover open={openFilters.category} onOpenChange={(open) => setOpenFilters(prev => ({ ...prev, category: open }))}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 border-dashed">
              <PlusCircle className="mr-2 h-4 w-4" />
              Category
              {activeFilters.category && activeFilters.category.length > 0 && (
                <>
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal lg:hidden"
                  >
                    {activeFilters.category.length}
                  </Badge>
                  <div className="hidden space-x-1 lg:flex">
                     {/* Always show count badge if items selected */}
                     <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal"
                      >
                        {activeFilters.category.length} selected
                      </Badge>
                  </div>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Filter categories..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {categoryOptions.map((option) => {
                    const isSelected = activeFilters.category?.some(f => f.value === option.value) || false;
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => onFilterSelect('category_id', option)}
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className={cn("h-4 w-4")} />
                        </div>
                        <span>{option.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                {activeFilters.category && activeFilters.category.length > 0 && (
                   <CommandItem
                     onSelect={() => {
                        // Clear only category filters
                        const currentCategoryIds = activeFilters.category?.map(opt => opt.value) || [];
                        currentCategoryIds.forEach(id => onRemoveFilter('category', id));
                        setOpenFilters(prev => ({ ...prev, category: false })); // Close popover
                     }}
                     className="justify-center text-center text-muted-foreground text-xs cursor-pointer hover:bg-accent"
                   >
                     Clear selection
                   </CommandItem>
                 )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Brand Filter */}
        <Popover open={openFilters.brand} onOpenChange={(open) => setOpenFilters(prev => ({ ...prev, brand: open }))}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 border-dashed">
              <PlusCircle className="mr-2 h-4 w-4" />
              Brand
              {activeFilters.brand && activeFilters.brand.length > 0 && (
                <>
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal lg:hidden"
                  >
                    {activeFilters.brand.length}
                  </Badge>
                  <div className="hidden space-x-1 lg:flex">
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {activeFilters.brand.length} selected
                    </Badge>
                  </div>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Filter brands..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {brandOptions.map((option) => {
                    const isSelected = activeFilters.brand?.some(f => f.value === option.value) || false;
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => onFilterSelect('brand_id', option)}
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className={cn("h-4 w-4")} />
                        </div>
                        <span>{option.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                 {activeFilters.brand && activeFilters.brand.length > 0 && (
                   <CommandItem
                      onSelect={() => {
                        // Clear only brand filters
                        const currentBrandIds = activeFilters.brand?.map(opt => opt.value) || [];
                        currentBrandIds.forEach(id => onRemoveFilter('brand', id));
                        setOpenFilters(prev => ({ ...prev, brand: false })); // Close popover
                     }}
                     className="justify-center text-center text-muted-foreground text-xs cursor-pointer hover:bg-accent"
                   >
                     Clear selection
                   </CommandItem>
                 )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Series Filter */}
        <Popover open={openFilters.series} onOpenChange={(open) => setOpenFilters(prev => ({ ...prev, series: open }))}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 border-dashed">
              <PlusCircle className="mr-2 h-4 w-4" />
              Series
              {activeFilters.series && activeFilters.series.length > 0 && (
                <>
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal lg:hidden"
                  >
                    {activeFilters.series.length}
                  </Badge>
                  <div className="hidden space-x-1 lg:flex">
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {activeFilters.series.length} selected
                    </Badge>
                  </div>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Filter series..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {seriesOptions.map((option) => {
                    const isSelected = activeFilters.series?.some(f => f.value === option.value) || false;
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => onFilterSelect('series_id', option)}
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className={cn("h-4 w-4")} />
                        </div>
                        <span>{option.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                 {activeFilters.series && activeFilters.series.length > 0 && (
                   <CommandItem
                     onSelect={() => {
                        // Clear only series filters
                        const currentSeriesIds = activeFilters.series?.map(opt => opt.value) || [];
                        currentSeriesIds.forEach(id => onRemoveFilter('series', id));
                        setOpenFilters(prev => ({ ...prev, series: false })); // Close popover
                     }}
                     className="justify-center text-center text-muted-foreground text-xs cursor-pointer hover:bg-accent"
                   >
                     Clear selection
                   </CommandItem>
                 )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear Filters Button (Reset All) */}
        {(totalActiveFilters > 0 || filters.title) && (
          <Button
            variant="ghost"
            onClick={onClearAllFilters} // This clears ALL filters (including search)
            className="h-9 px-2 lg:px-3"
          >
            Reset All
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Display Active Filter Badges */}
      {(totalActiveFilters > 0 || filters.title) && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-dashed">
          {/* Map through active filters to display badges */}
          {activeFilters.category?.map((option) => (
              <Badge variant="secondary" key={`category-${option.value}`}>
                  {option.label}
                  <button
                      onClick={() => onRemoveFilter('category', option.value)}
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
              </Badge>
          ))}
          {activeFilters.brand?.map((option) => (
              <Badge variant="secondary" key={`brand-${option.value}`}>
                  {option.label}
                  <button
                      onClick={() => onRemoveFilter('brand', option.value)}
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
              </Badge>
          ))}
           {activeFilters.series?.map((option) => (
              <Badge variant="secondary" key={`series-${option.value}`}>
                  {option.label}
                  <button
                      onClick={() => onRemoveFilter('series', option.value)}
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
              </Badge>
          ))}
          {/* Display search term badge */}
          {filters.title && (
            <Badge variant="secondary">
              Search: "{filters.title}"
              <button
                onClick={onClearSearch}
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
