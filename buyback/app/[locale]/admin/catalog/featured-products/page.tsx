"use client";

import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { featuredDeviceService, shopService } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModels } from '@/hooks/catalog/useModels';
import { DataTable } from '@/components/admin/catalog/data-table';
import { columns, type FeaturedDevice } from '@/components/admin/catalog/featured-products-columns';
import { useDebounce } from 'use-debounce';
import { ColumnFiltersState } from '@tanstack/react-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function FeaturedProductsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [debouncedColumnFilters] = useDebounce(columnFilters, 500);

  const modelTitleFilter = debouncedColumnFilters.find(f => f.id === 'model.title')?.value as string | undefined;
  const shopNameFilter = debouncedColumnFilters.find(f => f.id === 'shop.name')?.value as string[] | undefined;

  const queryClient = useQueryClient();

  const {
    data: featuredDevicesResponse,
    isLoading: isLoadingFeaturedDevices,
    isError: isFeaturedDevicesError,
    error: featuredDevicesError
  } = useQuery({
    queryKey: ['featuredDevices', modelTitleFilter, shopNameFilter],
    queryFn: () => featuredDeviceService.getFeaturedDevicesAdmin({
      modelTitle: modelTitleFilter,
      shopName: shopNameFilter?.join(','),
    })
  });

  const {
    data: shopsResponse,
    isLoading: isLoadingShops
  } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopService.getShops()
  });

  const {
    data: modelsResponse,
    isLoading: isLoadingModels
  } = useModels({ limit: 100 });

  const createFeaturedDeviceMutation = useMutation({
    mutationFn: (data: { modelId: number, shopId: number, isPublished: boolean }) =>
      featuredDeviceService.createFeaturedDevice(data),
    onSuccess: () => {
      toast.success("Featured product created successfully");
      setSelectedModelId(null);
      setSelectedShopId(null);
      setIsPublished(false);
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['featuredDevices'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "An unknown error occurred");
    }
  });

  const handleSubmit = () => {
    if (!selectedModelId || !selectedShopId) {
      toast.error("Please select both a model and a shop.");
      return;
    }

    setIsSubmitting(true);

    createFeaturedDeviceMutation.mutate({
      modelId: selectedModelId,
      shopId: selectedShopId,
      isPublished
    }, {
      onSettled: () => {
        setIsSubmitting(false);
      }
    });
  };

  const featuredDevices = featuredDevicesResponse?.data ?? [] as FeaturedDevice[];
  const shops = shopsResponse?.data ?? [];
  const models = modelsResponse?.data ?? [];

  const filterOptions = [
    {
      key: 'shop.name',
      label: 'Shop',
      options: shops.map(shop => ({ value: shop.name!, label: shop.name! })).filter(option => option.value)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={isLoadingModels || isLoadingShops}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Featured Product
        </Button>
      </div>

      {isFeaturedDevicesError && (
        <div className="text-red-500 p-4 bg-red-50 rounded-md">
          Error loading featured products: {featuredDevicesError?.message}
        </div>
      )}

      <DataTable
        columns={columns}
        data={featuredDevices}
        isLoading={isLoadingFeaturedDevices}
        searchKey="model.title"
        searchPlaceholder="Search by model name..."
        filterOptions={filterOptions}
        manualFiltering={true}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
      />

      {!isLoadingFeaturedDevices && !isFeaturedDevicesError && featuredDevices.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          No featured products found. Create one by clicking the &quot;Add Featured Product&quot; button.
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Featured Product</DialogTitle>
            <DialogDescription>
              Select a model and shop to feature this product.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">
                Model
              </Label>
              <Select
                onValueChange={(value) => setSelectedModelId(Number(value))}
                value={selectedModelId?.toString() || undefined}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingModels ? (
                    <SelectItem value="loading" disabled>Loading models...</SelectItem>
                  ) : (
                    models.map((model) => (
                      <SelectItem key={model.id} value={model.id!.toString()}>
                        {model.title} {model.brand?.title ? `(${model.brand.title})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shop" className="text-right">
                Shop
              </Label>
              <Select
                onValueChange={(value) => setSelectedShopId(Number(value))}
                value={selectedShopId?.toString() || undefined}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a shop" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingShops ? (
                    <SelectItem value="loading" disabled>Loading shops...</SelectItem>
                  ) : (
                    (shopsResponse?.data || []).map((shop) => (
                      <SelectItem key={shop.id} value={shop.id!.toString()}>
                        {shop.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="published" className="text-right">
                Published
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                  id="published"
                />
                <Label htmlFor="published">
                  {isPublished ? 'Yes' : 'No'}
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedModelId || !selectedShopId}
            >
              {isSubmitting ? 'Adding...' : 'Add Featured Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
