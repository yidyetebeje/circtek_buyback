import React, { useState } from 'react';
import { Globe, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublishToShopsModal } from './publish-to-shops-modal';
import { useQueryClient } from '@tanstack/react-query';

interface PublishedShop {
  shop_id: number;
}

interface PublishActionCellProps {
  entityId: number;
  entityName: string;
  entityType: 'brand' | 'category' | 'model-series' | 'model';
  publishedInShops?: PublishedShop[];
  onSuccess?: () => void;
}

export function PublishActionCell({
  entityId,
  entityName,
  entityType,
  publishedInShops = [],
  onSuccess
}: PublishActionCellProps) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalMode, setModalMode] = useState<'publish' | 'unpublish'>('publish');
  
  // Add query client for manual invalidation
  const queryClient = useQueryClient();

  // Function to refresh data by invalidating relevant queries
  const refreshData = () => {
    // Invalidate based on entity type
    switch (entityType) {
      case 'brand':
        queryClient.invalidateQueries({ queryKey: ['brandStatus'] });
        queryClient.invalidateQueries({ queryKey: ['brandStatuses'] });
        queryClient.invalidateQueries({ queryKey: ['brand', entityId] });
        queryClient.invalidateQueries({ queryKey: ['brands'] });
        break;
      case 'category':
        queryClient.invalidateQueries({ queryKey: ['categoryStatus'] });
        queryClient.invalidateQueries({ queryKey: ['categoryStatuses'] });
        queryClient.invalidateQueries({ queryKey: ['category', entityId] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        break;
      case 'model-series':
        queryClient.invalidateQueries({ queryKey: ['modelSeriesStatus'] });
        queryClient.invalidateQueries({ queryKey: ['modelSeriesStatuses'] });
        queryClient.invalidateQueries({ queryKey: ['modelSeries', entityId] });
        queryClient.invalidateQueries({ queryKey: ['modelSeries'] });
        break;
      case 'model':
        queryClient.invalidateQueries({ queryKey: ['modelStatus'] });
        queryClient.invalidateQueries({ queryKey: ['modelStatuses'] });
        queryClient.invalidateQueries({ queryKey: ['modelStatusesForShops'] });
        queryClient.invalidateQueries({ queryKey: ['modelPricesForShops'] });
        queryClient.invalidateQueries({ queryKey: ['model', entityId] });
        queryClient.invalidateQueries({ queryKey: ['models'] });
        break;
    }
    
    // Generic entity status invalidation
    queryClient.invalidateQueries({ queryKey: ['entityStatus'] });
    queryClient.invalidateQueries({ queryKey: ['entityStatuses'] });
  };

  const isPublished = publishedInShops.length > 0;

  return (
    <div className="flex items-center">
      {isLoading ? (
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="sr-only">Loading...</span>
        </Button>
      ) : isPublished ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0 text-green-600 hover:text-red-600 hover:bg-red-50"
          onClick={() => {
            setModalMode('unpublish');
            setShowModal(true);
          }}
          title={`Published in ${publishedInShops.length} shop${publishedInShops.length !== 1 ? 's' : ''}`}
        >
          <Check className="h-4 w-4" />
          <span className="sr-only">Unpublish</span>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          onClick={() => {
            setModalMode('publish');
            setShowModal(true);
          }}
          title="Not published"
        >
          <Globe className="h-4 w-4" />
          <span className="sr-only">Publish</span>
        </Button>
      )}

      <PublishToShopsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        entityIds={[entityId]}
        entityType={entityType}
        entityName={entityName}
        publishedInShops={publishedInShops}
        initialUnpublishMode={modalMode === 'unpublish'}
        onSuccess={() => {
          // Force refresh data
          refreshData();
          
          // Call additional onSuccess if provided
          onSuccess?.();
          setIsLoading(false);
          setShowModal(false);
        }}
      />
    </div>
  );
} 