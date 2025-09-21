import { t } from "elysia";

export const RepairListQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 50 })),
  start_date: t.Optional(t.String({ format: 'date' })),
  end_date: t.Optional(t.String({ format: 'date' })),
  warehouse_id: t.Optional(t.Numeric()),
  actor_id: t.Optional(t.Numeric()),
  tenant_id: t.Optional(t.Numeric()),
  status: t.Optional(t.Boolean())
});

export const DeviceRepairHistoryQuery = t.Object({
  imei: t.Optional(t.String({ minLength: 1 })),
  serial: t.Optional(t.String({ minLength: 1 })),
  tenant_id: t.Optional(t.Numeric())
});

export const DeviceListQuery = t.Object({
  tenant_id: t.Optional(t.Numeric()),
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 1000, default: 100 }))
});

export interface RepairListResponse {
  id: number;
  device_id: number;
  remarks: string | null;
  status: boolean | null;
  actor_id: number;
  tenant_id: number;
  warehouse_id: number;
  created_at: Date | null;
  updated_at: Date | null;
  
  // Device details
  device_sku: string | null;
  device_lpn: string | null;
  device_serial: string | null;
  device_imei: string | null;
  
  // Deprecated global repair reason removed; reasons available per item
  
  // Actor (user) details
  actor_name: string;
  actor_user_name: string;
  actor_email: string;
  
  // Warehouse details
  warehouse_name: string;
  warehouse_description: string;
  
  // Tenant details
  tenant_name: string;
  tenant_description: string;
  
  // Repair items
  repair_items: Array<{
    id: number;
    sku: string | null;
    quantity: number;
    cost: string;
    reason_id: number;
    reason_name: string;
    purchase_items_id: number | null;
    created_at: Date | null;
  }>;
}

export interface DeviceRepairHistoryResponse {
  device: {
    id: number;
    sku: string | null;
    lpn: string | null;
    serial: string | null;
    imei: string | null;
  };
  repairs: Array<RepairListResponse>;
}

export interface DeviceListResponse {
  imei: string | null;
  serial: string | null;
  lpn: string | null;
}


