"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Model } from '@/types/catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Loader2, Package } from 'lucide-react';
import { shopService } from '@/lib/api/catalog/shopService';

// Temporary interface for backend response that uses 'meta' instead of 'pagination'
interface BackendResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ProductSelectorProps {
  onProductSelected: (product: Model) => void;
  onBack: () => void;
  locale: string;
  shopId: number;
}

export function ProductSelector({ onProductSelected, onBack, shopId }: ProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  
  // Use the passed shopId instead of getting it from environment variable
  // shopId is now passed as a prop from the server component
  
  // Debug logging
  console.log('ProductSelector shopId:', shopId);

  // Fetch categories for filtering
  const { data: categoriesData } = useQuery({
    queryKey: ['published-categories', shopId],
    queryFn: async () => {
      console.log('Fetching categories for shopId:', shopId);
      const result = await shopService.getPublishedCategories(shopId, { limit: 100 });
      console.log('Categories result:', result);
      return result;
    },
    enabled: !!shopId && shopId > 0,
  });



  // Fetch published models
  const { data: modelsData, isLoading, error } = useQuery({
    queryKey: ['published-models', shopId, searchTerm, selectedCategoryId, page],
    queryFn: async () => {
      console.log('Fetching models for shopId:', shopId, 'with params:', {
        search: searchTerm || undefined,
        categoryId: selectedCategoryId,
        page,
        limit: 12,
      });
      const result = await shopService.getPublishedModels(shopId, {
        search: searchTerm || undefined,
        categoryId: selectedCategoryId,
        page,
        limit: 12,
      });
      console.log('Models result:', result);
      return result;
    },
    enabled: !!shopId && shopId > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategoryId(undefined);
    setPage(1);
  };

  const handleSelectProduct = (product: Model) => {
    onProductSelected(product);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select Product</h2>
          <p className="text-gray-600">
            Choose the published product that matches the tested device to proceed with pricing.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search products by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit" className="px-6">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px]">
            <Select 
              value={selectedCategoryId?.toString() || "all"} 
              onValueChange={(value) => {
                setSelectedCategoryId(value !== "all" ? Number(value) : undefined);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesData?.data.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || selectedCategoryId) && (
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading products...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="text-red-600 mb-2">Error loading products</div>
            <p className="text-gray-600">Please try again or adjust your search criteria.</p>
          </div>
        )}

        {modelsData && !isLoading && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {(modelsData as unknown as BackendResponse<Model>).meta.total} product(s) found
              </h3>
              {(modelsData as unknown as BackendResponse<Model>).meta.totalPages > 1 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  Page {(modelsData as unknown as BackendResponse<Model>).meta.page} of {(modelsData as unknown as BackendResponse<Model>).meta.totalPages}
                </div>
              )}
            </div>

            {modelsData.data.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria or clear filters to see all products.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {modelsData.data.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors p-2 rounded-lg group"
                  >
                    {/* Product Image */}
                    <div className="w-full h-24 bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden group-hover:bg-gray-200 transition-colors">
                      {product.model_image ? (
                        <img
                          src={product.model_image}
                          alt={product.title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* Product Title */}
                    <h4 className="text-sm font-medium text-gray-900 text-center line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {product.title}
                    </h4>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {(modelsData as unknown as BackendResponse<Model>).meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  {page} / {(modelsData as unknown as BackendResponse<Model>).meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= (modelsData as unknown as BackendResponse<Model>).meta.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Device Info
        </Button>
      </div>
    </div>
  );
} 