import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { useStockById } from '@/hooks/useStock';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  stockId?: number;
}

export function StockDetailModal({ open, onClose, stockId }: Props) {
  const { data, isLoading } = useStockById(open && stockId ? stockId : undefined);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Stock Detail</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-2 text-sm">
            <p><strong>ID:</strong> {data.id}</p>
            <p><strong>IMEI:</strong> {data.imei}</p>
            <p><strong>Serial:</strong> {data.serial ?? '-'}</p>
            <p><strong>SKU:</strong> {data.sku}</p>
            <p><strong>Grade:</strong> {data.grade ?? '-'}</p>
            <p><strong>Model:</strong> {data.modelName ?? '-'}</p>
            <p><strong>Storage:</strong> {data.storage ?? '-'}</p>
            <p><strong>Color:</strong> {data.colorName ?? '-'}</p>
            <p><strong>Warehouse:</strong> {data.warehouseName}</p>
            <p><strong>Status:</strong> {data.isDead ? 'Dead' : 'Alive'}</p>
            <p><strong>Received:</strong> {data.createdAt ?? '-'}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">Not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
} 