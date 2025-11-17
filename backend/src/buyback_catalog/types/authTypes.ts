import { Context } from "elysia";

export interface JwtUser {
  id: number;
  fName?: string;
  lName?: string;
  userName?: string;
  email?: string;
  tenantId?: number;
  roleId?: number;
  roleName?: string;
  roleSlug?: string;
  warehouseId?: number;
  shopId?: number;
  managed_shop_id?: number;
}

export interface AuthContext extends Context {
  user: JwtUser | null;
} 