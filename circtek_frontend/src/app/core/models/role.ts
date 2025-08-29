import { ApiResponse } from './api';

export interface Role {
  id: number;
  name: string;
  description: string;
  status: boolean | null;
}

export type RoleListResponse = ApiResponse<Role[]>;
