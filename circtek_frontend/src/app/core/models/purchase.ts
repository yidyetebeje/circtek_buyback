export interface PurchaseRecord {
  id: number;
  purchase_order_no: string;
  supplier_name: string;
  supplier_order_no: string;
  expected_delivery_date: string | null; // ISO string
  customer_name: string | null;
  remarks: string | null;
  invoice: string | null;
  transport_doc: string | null;
  receiving_picture: string | null;
  order_confirmation_doc: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  status: boolean | null;
  warehouse_id: number;
  tenant_id: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PurchaseItemRecord {
  id: number;
  purchase_id: number;
  sku: string | null;
  quantity: number;
  quantity_used_for_repair: number | null;
  price: number;
  is_part: boolean | null;
  status: boolean | null;
  tenant_id: number;
  created_at: string | null;
}

export interface ReceivedItemRecord {
  id: number;
  purchase_id: number;
  purchase_item_id: number | null;
  sku: string | null;
  device_id: number | null;
  quantity: number;
  received_at: string | null;
  status: boolean | null;
  tenant_id: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PurchaseWithItemsAndReceived {
  purchase: PurchaseRecord;
  items: Array<PurchaseItemRecord & {
    received_quantity: number;
    remaining_quantity: number;
  }>;
  total_items: number;
  total_received: number;
  is_fully_received: boolean;
}

export interface ReceivingResult {
  purchase_id: number;
  received_items: ReceivedItemRecord[];
  stock_movements_created: number;
  total_quantity_received: number;
}

export interface ReceiveItemsRequestItem {
  purchase_item_id: number;
  sku: string;
  quantity_received: number;
  device_id?: number;
  identifiers?: string[];
}

export interface ReceiveItemsRequest {
  purchase_id?: number; // filled by route param in backend
  items: ReceiveItemsRequestItem[];
  warehouse_id: number;
  actor_id: number;
}
