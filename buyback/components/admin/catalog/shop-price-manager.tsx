'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Banknote, Save, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useShops } from '@/hooks/catalog/useShops';
import { useUpdateModelPrice, useUpdateModelPriceAllShops } from '@/hooks/catalog/useShopModelPrices';
import { useModelStatusesForShops } from '@/hooks/catalog/useShopCatalog';
import { toast } from 'sonner';

interface ShopPriceManagerProps {
  modelId: number;
  modelTitle: string;
  defaultPrice?: number;
}

interface ShopPriceData {
  shopId: number;
  shopName: string;
  currentPrice?: number;
  newPrice: string;
  isPublished: boolean;
}

export const ShopPriceManager: React.FC<ShopPriceManagerProps> = ({
  modelId,
  modelTitle,
  defaultPrice = 0
}) => {
  const [bulkPrice, setBulkPrice] = useState<string>('');
  const [shopPrices, setShopPrices] = useState<ShopPriceData[]>([]);
  const [selectedShops, setSelectedShops] = useState<Set<number>>(new Set());

  // Fetch shops
  const { data: shopsResponse, isLoading: isLoadingShops } = useShops();
  const shops = useMemo(() => shopsResponse?.data || [], [shopsResponse?.data]);

  // Mutations
  const updateSinglePrice = useUpdateModelPrice();
  const updateBulkPrice = useUpdateModelPriceAllShops();

  // Get model statuses for all shops to see current prices and publish status
  const shopIds = useMemo(() => shops.map(shop => shop.id), [shops]);
  const { data: modelStatusesData, isLoading: isLoadingStatuses } = useModelStatusesForShops(modelId, shopIds);

  // Stabilize the model statuses data to prevent unnecessary re-renders
  const stableModelStatusesData = useMemo(() => modelStatusesData, [modelStatusesData]);

  // Create status map for efficient lookups
  const statusMap = useMemo(() => {
    if (!stableModelStatusesData) return new Map();
    return new Map(
      stableModelStatusesData.map(item => [
        item.shopId,
        item.data
      ])
    );
  }, [stableModelStatusesData]);

  // Initialize shop prices data
  useEffect(() => {
    if (shops.length > 0 && stableModelStatusesData) {
      setShopPrices(prevShopPrices => {
        // Check if we actually need to update
        const needsUpdate = shops.some(shop => {
          const existingShop = prevShopPrices.find(sp => sp.shopId === shop.id);
          const status = statusMap.get(shop.id);
          const currentPrice = status?.base_price ?? defaultPrice;
          
          return !existingShop || 
                 existingShop.currentPrice !== currentPrice ||
                 existingShop.shopName !== shop.name ||
                 existingShop.isPublished !== Boolean(status?.is_published);
        });

        if (!needsUpdate && prevShopPrices.length === shops.length) {
          return prevShopPrices; // No update needed
        }

        return shops.map(shop => {
          const status = statusMap.get(shop.id);
          const currentPrice = status?.base_price ?? defaultPrice;
          
          // For existing shop entries, preserve the newPrice unless currentPrice changed
          const existingShop = prevShopPrices.find(sp => sp.shopId === shop.id);
          const shouldUpdateNewPrice = !existingShop || existingShop.currentPrice !== currentPrice;
          const newPrice = shouldUpdateNewPrice 
            ? String(currentPrice)
            : existingShop.newPrice;
          
          return {
            shopId: shop.id,
            shopName: shop.name,
            currentPrice: currentPrice,
            newPrice: newPrice,
            isPublished: Boolean(status?.is_published)
          };
        });
      });
    }
  }, [shops, statusMap, defaultPrice, stableModelStatusesData]);

  const handleShopPriceChange = useCallback((shopId: number, newPrice: string) => {
    setShopPrices(prev => 
      prev.map(shop => 
        shop.shopId === shopId 
          ? { ...shop, newPrice }
          : shop
      )
    );
  }, []);

  const handleSingleShopUpdate = useCallback(async (shopData: ShopPriceData) => {
    const price = parseFloat(shopData.newPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    updateSinglePrice.mutate({
      shopId: shopData.shopId,
      modelId,
      basePrice: price
    });
  }, [updateSinglePrice, modelId]);

  const handleBulkUpdate = useCallback(async () => {
    const price = parseFloat(bulkPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid bulk price');
      return;
    }

    const shopsToUpdate = selectedShops.size > 0 
      ? Array.from(selectedShops)
      : shopPrices.map(shop => shop.shopId);

    updateBulkPrice.mutate({
      modelId,
      shopIds: shopsToUpdate,
      basePrice: price
    }, {
      onSuccess: () => {
        setBulkPrice('');
        setSelectedShops(new Set());
      }
    });
  }, [bulkPrice, selectedShops, shopPrices, updateBulkPrice, modelId]);

  const handleShopSelection = useCallback((shopId: number, selected: boolean) => {
    setSelectedShops(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(shopId);
      } else {
        newSet.delete(shopId);
      }
      return newSet;
    });
  }, []);

  const selectAllShops = useCallback(() => {
    setSelectedShops(new Set(shopPrices.map(shop => shop.shopId)));
  }, [shopPrices]);

  const clearSelection = useCallback(() => {
    setSelectedShops(new Set());
  }, []);

  if (isLoadingShops || isLoadingStatuses) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading shops and pricing data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Shop Price Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage pricing for &ldquo;{modelTitle}&rdquo; across different shops
          </p>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Publishing Status:</strong> &ldquo;Published&rdquo; means the model is visible and available for purchase in that shop. 
              &ldquo;Not Published&rdquo; means the model exists in the shop&apos;s catalog but is hidden from customers and cannot be purchased.
            </p>
          </div>
        </div>
      </div>

      {/* Bulk Update Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Bulk Price Update
          </CardTitle>
          <CardDescription>
            Update prices for multiple shops at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span>Selected shops: {selectedShops.size}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllShops}
              disabled={selectedShops.size === shopPrices.length}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              disabled={selectedShops.size === 0}
            >
              Clear Selection
            </Button>
          </div>
          
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="bulk-price">New Price (for {selectedShops.size || shopPrices.length} shops)</Label>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="bulk-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder="Enter bulk price"
                  className="pl-9"
                />
              </div>
            </div>
            <Button
              onClick={handleBulkUpdate}
              disabled={!bulkPrice || updateBulkPrice.isPending}
              className="px-6"
            >
              {updateBulkPrice.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update All
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Individual Shop Prices */}
      <div className="space-y-4">
        <h4 className="text-md font-medium">Individual Shop Prices</h4>
        <div className="grid gap-4">
          {shopPrices.map((shopData) => (
            <Card key={shopData.shopId} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedShops.has(shopData.shopId)}
                    onChange={(e) => handleShopSelection(shopData.shopId, e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <h5 className="font-medium">{shopData.shopName}</h5>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Current: ${shopData.currentPrice?.toFixed(2) || '0.00'}</span>
                      <Badge variant={shopData.isPublished ? 'default' : 'secondary'}>
                        {shopData.isPublished ? 'Published' : 'Not Published'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-end gap-2">
                  <div>
                    <Label htmlFor={`price-${shopData.shopId}`} className="text-xs">
                      New Price
                    </Label>
                    <div className="relative">
                      <Banknote className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        id={`price-${shopData.shopId}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={shopData.newPrice}
                        onChange={(e) => handleShopPriceChange(shopData.shopId, e.target.value)}
                        className="w-28 pl-7 text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSingleShopUpdate(shopData)}
                    disabled={
                      updateSinglePrice.isPending ||
                      shopData.newPrice === String(shopData.currentPrice) ||
                      !shopData.newPrice ||
                      isNaN(parseFloat(shopData.newPrice))
                    }
                  >
                    {updateSinglePrice.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};