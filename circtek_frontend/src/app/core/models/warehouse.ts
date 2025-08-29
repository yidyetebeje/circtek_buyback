import { ApiResponse } from './api';

export interface Warehouse {
  id: number;
  name: string;
  description: string;
  status: boolean | null;
  tenant_id: number;
  created_at: string | null;
}

export type WarehouseListResponse = ApiResponse<Warehouse[]>;
