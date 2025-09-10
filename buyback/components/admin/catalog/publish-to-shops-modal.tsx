import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Globe, Loader2, Store, Check, X } from 'lucide-react';
import { useShops } from '@/hooks/catalog/useShops';
import { 
  shopCatalogService, 
  MultipleShopsEntityPublish,
  BulkPublishToMultipleShops
} from '@/lib/api/catalog/shopCatalogService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

type EntityType = 'brand' | 'category' | 'model-series' | 'model' | 'device-question' | 'faq';

interface PublishedShop {
  shop_id: number;
}

interface PublishToShopsModalProps {
  open: boolean;
  onClose: () => void;
  entityIds: number[];
  entityType: EntityType;
  entityName: string;
  publishedInShops?: PublishedShop[];
  initialUnpublishMode?: boolean;
  onSuccess?: () => void;
}

export function PublishToShopsModal({
  open,
  onClose,
  entityIds,
  entityType,
  entityName,
  publishedInShops = [],
  initialUnpublishMode = false,
  onSuccess
}: PublishToShopsModalProps) {
  // Get current user session to check role
  const { data: session } = useSession();
  const isShopManager = session?.user?.roleSlug === 'shop_manager';
  const managedShopId = session?.user?.managed_shop_id;
  // Extract shop IDs from the publishedInShops array
  const publishedShopIds = publishedInShops.map(item => item.shop_id);
  
  const [selectedShops, setSelectedShops] = useState<number[]>(publishedShopIds);
  const [isLoading, setIsLoading] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [isUnpublishMode, setIsUnpublishMode] = useState(initialUnpublishMode);
  
  // Add queryClient to invalidate queries after operations
  const queryClient = useQueryClient();
  
  // Fetch shops
  const { data: shopsResponse, isLoading: isLoadingShops } = useShops({});
  const shops = shopsResponse?.data || [];
  
  // Use a ref to track initialization to avoid loops
  const initializedRef = useRef(false);
  
  // Initialize selected shops when publishedInShops changes
  useEffect(() => {
    // In publish mode, start with current published shops
    // In unpublish mode, start with no selected shops (nothing to unpublish by default)
    setSelectedShops(isUnpublishMode ? [] : publishedShopIds);
    
    // Reset selectAll flag when publishedInShops changes
    if (shops.length > 0) {
      if (isUnpublishMode) {
        setSelectAll(false);
      } else {
        setSelectAll(publishedShopIds.length === shops.length);
      }
    }
  }, [shops.length, isUnpublishMode]);
  
  // Initialize selectAll when shops are loaded
  useEffect(() => {
    if (shops.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      // Set selectAll to true if all shops are already selected
      if (!isUnpublishMode && selectedShops.length === shops.length) {
        setSelectAll(true);
      }
    }
  }, [shops, selectedShops.length, isUnpublishMode]);
  
  // Effect to handle changes to initialUnpublishMode
  useEffect(() => {
    setIsUnpublishMode(initialUnpublishMode);
  }, [initialUnpublishMode]);
  
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      if (isUnpublishMode) {
        // Select all published shops for unpublishing
        setSelectedShops([...publishedShopIds]);
      } else {
        // Select all shops for publishing
        setSelectedShops(shops.map(shop => shop.id));
      }
    } else {
      // Deselect all shops
      setSelectedShops([]);
    }
  };
  
  const handleToggleShop = (shopId: number) => {
    setSelectedShops(prev => {
      const isSelected = prev.includes(shopId);
      const newSelected = isSelected
        ? prev.filter(id => id !== shopId)
        : [...prev, shopId];
      
      // Update selectAll state based on the new selection
      if (isUnpublishMode) {
        const newAllSelected = publishedShopIds.length > 0 && 
          publishedShopIds.every(id => newSelected.includes(id));
        if (newAllSelected !== selectAll) {
          setSelectAll(newAllSelected);
        }
      } else {
        const newAllSelected = newSelected.length === shops.length;
        if (newAllSelected !== selectAll) {
          setSelectAll(newAllSelected);
        }
      }
      
      return newSelected;
    });
  };

  const handleToggleMode = () => {
    // Toggle the mode
    setIsUnpublishMode(!isUnpublishMode);
    // Reset selections when toggling modes
    if (!isUnpublishMode) {
      // Switching to unpublish mode - don't select any shops by default
      setSelectedShops([]);
      setSelectAll(false);
    } else {
      // Switching to publish mode - restore to current published shops
      setSelectedShops(publishedShopIds);
      setSelectAll(publishedShopIds.length === shops.length);
    }
  };
  
  const handleSubmit = async () => {
    // If shop manager, ensure we have the managed shop ID and use it exclusively
    if (isShopManager) {
      // Shop manager must have a managed shop ID
      if (!managedShopId) {
        toast.error("No managed shop found for your account. Please contact an administrator.");
        return;
      }
      // Log to verify the managed shop ID is available
      console.log("Using managed shop ID for shop manager:", managedShopId);
    } else if (selectedShops.length === 0) {
      // For non-shop managers, verify they selected at least one shop
      toast.error(`Please select at least one shop to ${isUnpublishMode ? "unpublish from" : "publish to"}`);
      return;
    }
    
    // Determine which shop IDs to use in the request
    // For shop managers: ALWAYS use the managed shop ID regardless of UI selection
    // For others: use their selected shops
    const shopsToUse = isShopManager ? [managedShopId!] : selectedShops;
    
    setIsLoading(true);
    try {
      if (entityIds.length > 1) {
        // For multiple entities (bulk action)
        
        // Create the bulk data payload for all entities across all selected shops
        const bulkData: BulkPublishToMultipleShops = {
          entityIds,
          shopIds: shopsToUse, // Use appropriate shop IDs based on role
          is_published: !isUnpublishMode // true for publish, false for unpublish
        };
        
        // Call the appropriate bulk method based on entity type
        switch (entityType) {
          case 'brand':
            await shopCatalogService.bulkPublishBrandsToMultipleShops(bulkData);
            break;
          case 'category':
            await shopCatalogService.bulkPublishCategoriesToMultipleShops(bulkData);
            break;
          case 'model-series':
            await shopCatalogService.bulkPublishModelSeriesToMultipleShops(bulkData);
            break;
          case 'model':
            await shopCatalogService.bulkPublishModelsToMultipleShops(bulkData);
            break;
          default:
            throw new Error(`Unsupported entity type: ${entityType}`);
        }
        
        if (isUnpublishMode) {
          toast.success(`Unpublished ${entityIds.length} ${entityType}s from ${shopsToUse.length} shops`);
        } else {
          // For publish mode, handle shops that need to be unpublished (those previously published but not in current selection)
          if (publishedShopIds.length > 0) {
            const shopsToUnpublish = publishedShopIds.filter(id => !shopsToUse.includes(id));
            
            if (shopsToUnpublish.length > 0) {
              const unpublishData: BulkPublishToMultipleShops = {
                entityIds,
                shopIds: shopsToUnpublish,
                is_published: false
              };
              
              // Call the appropriate bulk unpublish method
              switch (entityType) {
                case 'brand':
                  await shopCatalogService.bulkPublishBrandsToMultipleShops(unpublishData);
                  break;
                case 'category':
                  await shopCatalogService.bulkPublishCategoriesToMultipleShops(unpublishData);
                  break;
                case 'model-series':
                  await shopCatalogService.bulkPublishModelSeriesToMultipleShops(unpublishData);
                  break;
                case 'model':
                  await shopCatalogService.bulkPublishModelsToMultipleShops(unpublishData);
                  break;
              }
            }
          }
          
          toast.success(`Published ${entityIds.length} ${entityType}s to ${shopsToUse.length} shops`);
        }
      } else {
        // For single entity publish/unpublish
        const singleEntityId = entityIds[0];
        const singleData: MultipleShopsEntityPublish = {
          entityId: singleEntityId,
          shopIds: shopsToUse, // Use the proper shop IDs (managed shop for shop managers)
          is_published: !isUnpublishMode // true for publish, false for unpublish
        };
        
        // Log the request data to verify shop IDs are included
        console.log("Single entity publish data:", singleData);
        
        // Call the appropriate single entity method for multiple shops
        switch (entityType) {
          case 'brand':
            await shopCatalogService.publishBrandToMultipleShops(singleData);
            break;
          case 'category':
            await shopCatalogService.publishCategoryToMultipleShops(singleData);
            break;
          case 'model-series':
            await shopCatalogService.publishModelSeriesToMultipleShops(singleData);
            break;
          case 'model':
            await shopCatalogService.publishModelToMultipleShops(singleData);
            break;
          default:
            throw new Error(`Unsupported entity type: ${entityType}`);
        }
        
        if (isUnpublishMode) {
          toast.success(`Unpublished ${entityName} from ${shopsToUse.length} ${isShopManager ? 'managed shop' : 'shops'}`);
        } else {
          // Handle unpublishing from shops that were deselected (for publish mode only)
          if (publishedShopIds.length > 0) {
            const shopsToUnpublish = publishedShopIds.filter(id => !shopsToUse.includes(id));
            
            if (shopsToUnpublish.length > 0) {
              const unpublishData: MultipleShopsEntityPublish = {
                entityId: singleEntityId,
                shopIds: shopsToUnpublish,
                is_published: false
              };
              
              // Call the appropriate unpublish method
              switch (entityType) {
                case 'brand':
                  await shopCatalogService.publishBrandToMultipleShops(unpublishData);
                  break;
                case 'category':
                  await shopCatalogService.publishCategoryToMultipleShops(unpublishData);
                  break;
                case 'model-series':
                  await shopCatalogService.publishModelSeriesToMultipleShops(unpublishData);
                  break;
                case 'model':
                  await shopCatalogService.publishModelToMultipleShops(unpublishData);
                  break;
              }
            }
          }
          
          toast.success(`Published ${entityName} to ${shopsToUse.length} ${isShopManager ? 'managed shop' : 'shops'}`);
        }
      }
      
      // Invalidate relevant queries based on entity type
      // This will cause the UI to refresh with the latest data
      switch (entityType) {
        case 'brand':
          // Invalidate brand status queries
          queryClient.invalidateQueries({ queryKey: ['brandStatus'] });
          queryClient.invalidateQueries({ queryKey: ['brandStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['brands'] });
          break;
        case 'category':
          // Invalidate category status queries
          queryClient.invalidateQueries({ queryKey: ['categoryStatus'] });
          queryClient.invalidateQueries({ queryKey: ['categoryStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          break;
        case 'model-series':
          // Invalidate model series status queries
          queryClient.invalidateQueries({ queryKey: ['modelSeriesStatus'] });
          queryClient.invalidateQueries({ queryKey: ['modelSeriesStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['modelSeries'] });
          break;
        case 'model':
          // Invalidate model status queries
          queryClient.invalidateQueries({ queryKey: ['modelStatus'] });
          queryClient.invalidateQueries({ queryKey: ['modelStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['modelStatusesForShops'] });
          queryClient.invalidateQueries({ queryKey: ['modelPricesForShops'] });
          queryClient.invalidateQueries({ queryKey: ['models'] });
          break;
      }
      
      // Also invalidate entity status queries generically
      queryClient.invalidateQueries({ queryKey: ['entityStatus'] });
      queryClient.invalidateQueries({ queryKey: ['entityStatuses'] });
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error(`Failed to ${isUnpublishMode ? "unpublish" : "publish"}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter shops based on mode
  const displayShops = isUnpublishMode 
    ? shops.filter(shop => publishedShopIds.includes(shop.id))
    : shops;

  const handleUnpublishFromAll = async () => {
    setIsLoading(true);
    try {
      if (entityIds.length > 1) {
        const bulkData: BulkPublishToMultipleShops = {
          entityIds,
          shopIds: publishedShopIds,
          is_published: false
        };
        
        // Use the proper entity type method
        switch (entityType) {
          case 'brand':
            await shopCatalogService.bulkPublishBrandsToMultipleShops(bulkData);
            break;
          case 'category':
            await shopCatalogService.bulkPublishCategoriesToMultipleShops(bulkData);
            break;
          case 'model-series':
            await shopCatalogService.bulkPublishModelSeriesToMultipleShops(bulkData);
            break;
          case 'model':
            await shopCatalogService.bulkPublishModelsToMultipleShops(bulkData);
            break;
        }
        
        toast.success(`Unpublished ${entityIds.length} ${entityType}s from all shops`);
      } else {
        const singleData: MultipleShopsEntityPublish = {
          entityId: entityIds[0],
          shopIds: publishedShopIds,
          is_published: false
        };
        
        // Use the proper entity type method
        switch (entityType) {
          case 'brand':
            await shopCatalogService.publishBrandToMultipleShops(singleData);
            break;
          case 'category':
            await shopCatalogService.publishCategoryToMultipleShops(singleData);
            break;
          case 'model-series':
            await shopCatalogService.publishModelSeriesToMultipleShops(singleData);
            break;
          case 'model':
            await shopCatalogService.publishModelToMultipleShops(singleData);
            break;
        }
        
        toast.success(`Unpublished ${entityName} from all shops`);
      }
      
      // Invalidate relevant queries based on entity type
      switch (entityType) {
        case 'brand':
          queryClient.invalidateQueries({ queryKey: ['brandStatus'] });
          queryClient.invalidateQueries({ queryKey: ['brandStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['brands'] });
          break;
        case 'category':
          queryClient.invalidateQueries({ queryKey: ['categoryStatus'] });
          queryClient.invalidateQueries({ queryKey: ['categoryStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          break;
        case 'model-series':
          queryClient.invalidateQueries({ queryKey: ['modelSeriesStatus'] });
          queryClient.invalidateQueries({ queryKey: ['modelSeriesStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['modelSeries'] });
          break;
        case 'model':
          queryClient.invalidateQueries({ queryKey: ['modelStatus'] });
          queryClient.invalidateQueries({ queryKey: ['modelStatuses'] });
          queryClient.invalidateQueries({ queryKey: ['modelStatusesForShops'] });
          queryClient.invalidateQueries({ queryKey: ['modelPricesForShops'] });
          queryClient.invalidateQueries({ queryKey: ['models'] });
          break;
      }
      
      // Also invalidate entity status queries generically
      queryClient.invalidateQueries({ queryKey: ['entityStatus'] });
      queryClient.invalidateQueries({ queryKey: ['entityStatuses'] });
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error unpublishing:', error);
      toast.error("Failed to unpublish. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => !isLoading && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        {isShopManager && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md text-blue-700">
            <p>
              <strong>{isUnpublishMode ? "Unpublishing from" : "Publishing to"} your managed shop.</strong>
              {managedShopId ? (
                <span className="block mt-1 text-sm">Shop ID: {managedShopId}</span>
              ) : (
                <span className="block mt-1 text-sm text-red-600">No managed shop found. Please contact administrator.</span>
              )}
            </p>
          </div>
        )}
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {isUnpublishMode ? <X className="mr-2 h-5 w-5" /> : <Globe className="mr-2 h-5 w-5" />}
            {isUnpublishMode ? "Unpublish from Shops" : "Publish to Shops"}
          </DialogTitle>
          <DialogDescription>
            {entityIds.length > 1 
              ? `Select the shops ${isUnpublishMode ? "to unpublish" : "where you want to publish"} these ${entityIds.length} ${entityType}s.`
              : `Select the shops ${isUnpublishMode ? "to unpublish" : "where you want to publish"} "${entityName}".`
            }
            {publishedShopIds.length > 0 && (
              <div className="mt-2">
                <Badge variant="outline" className="flex items-center gap-1 text-xs py-1 px-2 bg-blue-50">
                  <Check className="h-3 w-3" />
                  Published in {publishedShopIds.length} shop{publishedShopIds.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {/* Mode toggle */}
        <div className="flex items-center justify-between py-2">
          <Label htmlFor="mode-toggle" className="flex items-center gap-2">
            <span className={isUnpublishMode ? "text-muted-foreground" : "font-medium text-primary"}>
              Publish Mode
            </span>
            <Switch 
              id="mode-toggle"
              checked={isUnpublishMode}
              onCheckedChange={handleToggleMode}
            />
            <span className={!isUnpublishMode ? "text-muted-foreground" : "font-medium text-red-600"}>
              Unpublish Mode
            </span>
          </Label>
        </div>
        
        <Separator className="my-2" />
        
        {isLoadingShops ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading shops...</span>
          </div>
        ) : (
          <>
            {displayShops.length === 0 ? (
              isUnpublishMode ? (
                <div className="text-center text-muted-foreground py-4">
                  Not published in any shops.
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No shops found. Please create a shop first.
                </div>
              )
            ) : (
              !isShopManager && (
                <>
                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox 
                      id="select-all" 
                      checked={selectAll} 
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="font-medium">
                      Select All {isUnpublishMode ? "for Unpublishing" : "Shops"}
                    </Label>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <ScrollArea className="max-h-[300px] pr-4">
                    <div className="space-y-3 py-2">
                      {displayShops.map(shop => {
                        const isPublished = publishedShopIds.includes(shop.id);
                        return (
                          <div key={shop.id} className="flex items-center space-x-3">
                            <Checkbox 
                              id={`shop-${shop.id}`} 
                              checked={selectedShops.includes(shop.id)}
                              onCheckedChange={() => handleToggleShop(shop.id)}
                            />
                            <div className="flex items-center flex-1">
                              {shop.icon ? (
                                <img 
                                  src={shop.icon} 
                                  alt={shop.name} 
                                  className="h-6 w-6 mr-2 object-contain"
                                />
                              ) : (
                                <Store className="h-5 w-5 mr-2 text-muted-foreground" />
                              )}
                              <Label htmlFor={`shop-${shop.id}`} className="cursor-pointer">
                                {shop.name}
                              </Label>
                              {isPublished && !isUnpublishMode && (
                                <Badge variant="outline" className="ml-2 flex items-center gap-1 text-xs py-0 px-1 bg-green-50">
                                  <Check className="h-3 w-3 text-green-500" />
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              )
            )}
          </>
        )}
        
        <DialogFooter className="sm:justify-between">
          <div>
            {!isShopManager && (
              <>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                
                {publishedShopIds.length > 0 && !isUnpublishMode && (
                  <Button 
                    variant="outline"
                    className="border-red-200 hover:bg-red-50 hover:text-red-600 ml-2"
                    onClick={handleUnpublishFromAll}
                    disabled={isLoading}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Unpublish from All
                  </Button>
                )}
              </>
            )}
          </div>
          
          <Button 
            onClick={handleSubmit}
            disabled={isShopManager ? isLoading : (isLoading || selectedShops.length === 0 || displayShops.length === 0)}
            className={`ml-2 ${isUnpublishMode ? "bg-red-600 hover:bg-red-700" : ""}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUnpublishMode ? "Unpublishing..." : "Publishing..."}
              </>
            ) : (
              isUnpublishMode ? "Unpublish Selected" : "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 