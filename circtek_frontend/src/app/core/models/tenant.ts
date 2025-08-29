import { ApiResponse } from './api';

export interface Tenant {
  id: number;
  name: string;
  description: string;
  status: boolean | null;
}

export type TenantListResponse = ApiResponse<Tenant[]>;
