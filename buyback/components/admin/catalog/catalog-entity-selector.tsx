"use client";

import { useState } from 'react';
import { Loader2, Search, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface CatalogEntity {
  id: number;
  title: string;
  icon?: string;
  image?: string;
  [key: string]: unknown;
}

interface CatalogEntitySelectorProps {
  entities: Array<CatalogEntity>;
  isLoading: boolean;
  selectedIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  imageKey: string;
  nameKey: string;
  emptyMessage: string;
}

export function CatalogEntitySelector({
  entities,
  isLoading,
  selectedIds,
  onSelectionChange,
  imageKey,
  nameKey,
  emptyMessage
}: CatalogEntitySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Filter entities based on search term
  const filteredEntities = entities.filter(entity => 
    entity[nameKey]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle select all toggle
  const handleSelectAll = () => {
    if (selectAll) {
      // If currently all selected, deselect all
      onSelectionChange([]);
      setSelectAll(false);
    } else {
      // If not all selected, select all filtered entities
      const allIds = filteredEntities.map(entity => entity.id).filter(Boolean) as number[];
      onSelectionChange(allIds);
      setSelectAll(true);
    }
  };

  // Handle individual selection toggle
  const handleToggleEntity = (entityId: number) => {
    if (selectedIds.includes(entityId)) {
      // If already selected, remove it
      onSelectionChange(selectedIds.filter(id => id !== entityId));
      setSelectAll(false);
    } else {
      // If not selected, add it
      onSelectionChange([...selectedIds, entityId]);
      // Check if all filtered entities are now selected
      const allFiltered = filteredEntities.map(entity => entity.id).filter(Boolean) as number[];
      if (
        allFiltered.length === selectedIds.length + 1 && 
        allFiltered.every(id => id === entityId || selectedIds.includes(id))
      ) {
        setSelectAll(true);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Select All */}
      <div className="flex space-x-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="select-all" 
            checked={selectAll && filteredEntities.length > 0} 
            disabled={filteredEntities.length === 0 || isLoading}
            onCheckedChange={handleSelectAll}
          />
          <label htmlFor="select-all" className="text-sm font-medium">
            Select All {filteredEntities.length > 0 ? `(${filteredEntities.length})` : ''}
          </label>
        </div>
      </div>

      {/* Entity Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading...</span>
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {searchTerm ? 'No matching results' : emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredEntities.map(entity => (
            <div 
              key={entity.id} 
              className={`border rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                selectedIds.includes(entity.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleToggleEntity(entity.id)}
            >
              <div className="relative aspect-square bg-gray-50">
                {entity[imageKey] ? (
                  <img 
                    src={entity[imageKey]?.toString()} 
                    alt={entity[nameKey]?.toString()}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">
                    <Image className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Checkbox 
                    checked={selectedIds.includes(entity.id)}
                    className="h-5 w-5 data-[state=checked]:bg-blue-500"
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => handleToggleEntity(entity.id)}
                  />
                </div>
              </div>
              <div className="p-2 text-center truncate text-sm font-medium">
                {entity[nameKey]?.toString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selection Summary */}
      {selectedIds.length > 0 && (
        <div className="mt-4 flex justify-between items-center p-2 bg-blue-50 rounded-md">
          <span className="text-sm">
            <span className="font-medium">{selectedIds.length}</span> item{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onSelectionChange([])}
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
} 