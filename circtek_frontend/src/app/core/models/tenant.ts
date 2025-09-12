import { ApiResponse } from './api';

export interface Tenant {
  id: number;
  name: string;
  description: string;
  status: boolean | null;
  logo: string | null;
}

export type TenantListResponse = ApiResponse<Tenant[]>;
