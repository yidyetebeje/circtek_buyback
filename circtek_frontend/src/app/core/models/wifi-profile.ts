import { ApiResponse } from './api';

export interface WiFiProfile {
  id: number;
  name: string;
  ssid: string;
  password: string;
  status: boolean | null;
  tenant_id: number;
  created_at: string | null;
  updated_at: string | null;
}

export type WiFiProfileListResponse = ApiResponse<WiFiProfile[]>;
