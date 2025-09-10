import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { StockItem } from '@/lib/api/stockService';
import { format } from 'date-fns';

export const stockColumns: ColumnDef<StockItem>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => row.getValue('id'),
    size: 60,
  },
  {
    accessorKey: 'imei',
    header: 'IMEI',
  },
  {
    accessorKey: 'serial',
    header: 'Serial',
  },
  {
    accessorKey: 'sku',
    header: 'SKU',
  },
  {
    accessorKey: 'modelName',
    header: 'Model',
  },
  {
    accessorKey: 'storage',
    header: 'Storage',
  },
  {
    accessorKey: 'colorName',
    header: 'Color',
  },
  {
    accessorKey: 'grade',
    header: 'Grade',
    cell: ({ row }) => {
      const grade = row.getValue<string>('grade');
      return grade ? <Badge>{grade}</Badge> : '-';
    },
  },
  {
    accessorKey: 'warehouseName',
    header: 'Location',
  },
  {
    id: 'status',
    accessorFn: (row) => (row.isDead ? 'dead' : 'alive'),
    header: 'Dead',
    cell: ({ row }) => (row.original.isDead ? 'Yes' : 'No'),
    size: 70,
  },
  {
    accessorKey: 'createdAt',
    header: 'Received',
    cell: ({ row }) => {
      const val = row.getValue<string | null>('createdAt');
      return val ? format(new Date(val), 'yyyy-MM-dd') : '-';
    },
  },
]; 