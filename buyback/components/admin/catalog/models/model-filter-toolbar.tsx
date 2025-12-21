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
        <div className="relative bg-card rounded-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {(isLoading || isSearching) && filters.title ? (
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-primary">
                <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.061l-2.755-2.755ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <Input
            placeholder="Search models by title..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-[200px] lg:w-[300px] pl-10 pr-10 rounded-xl border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/50"
          />
          {searchValue && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/60 hover:text-primary transition-colors z-10"
              aria-label="Clear search"
              onClick={onClearSearch}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          )}
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
