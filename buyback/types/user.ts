// Based on app/src/db/schema/user.ts

export interface Role {
  id: number;
  title: string;
  slug?: string; // Optional, but good to have if used
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: number;
  fName?: string | null;
  lName?: string | null;
  userName?: string | null;
  email?: string | null;
  password?: string | null; // Usually not sent to frontend
  roleId?: number | null;
  status?: boolean;
  tenantId?: number | null;
  tenant_id?: number | null; // Alternative form for tenantId
  warehouseId?: number | null;
  daysForImei?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  organizationName?: string | null;
  isPostpaid?: number | null; // tinyint might be number 0 or 1
  licensePlanId?: number | null;
  managed_shop_id?: number | null; // For shop managers

  // For frontend display, we might want the role object directly
  role?: Role | null;
}

// For API responses that include pagination or metadata
export interface PaginatedUsersResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PaginatedRolesResponse {
  data: Role[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// For User form values, which might differ slightly (e.g., password confirmation)
export interface UserFormValues {
  id?: number;
  fName: string;
  lName: string;
  userName: string;
  email: string;
  roleId: number; // roleId will be a string from select, convert to number
  status: boolean;
  password?: string; // Optional: only for create or password change
  confirmPassword?: string;
  organizationName?: string;
  managed_shop_id?: number; // Added for shop managers
  tenant_id?: number; // Added for tenant identification
  warehouseId?: number; // Added for warehouse assignment
} 