export interface User {
  id: number;
  name: string;
  user_name: string;
  email: string;
  role_id: number;
  role_name?: string | null;
  tenant_id: number;
  tenant_name?: string | null;
  warehouse_id?: number | null;
  status: boolean;
  created_at: string;
  updated_at: string;
}
