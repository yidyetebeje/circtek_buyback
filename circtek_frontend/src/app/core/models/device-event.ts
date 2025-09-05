export interface DeviceEvent {
  id: number;
  device_id: number;
  actor_id: number;
  event_type: 'DEAD_IMEI' | 'REPAIR_STARTED' | 'REPAIR_COMPLETED' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'TEST_COMPLETED';
  details: any;
  tenant_id: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface DeviceEventQuery {
  device_id?: number;
  imei?: string;
  serial?: string;
  lpn?: string;
  tenant_id?: number;
}
