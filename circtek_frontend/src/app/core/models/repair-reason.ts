export interface RepairReasonRecord {
  id: number;
  name: string;
  description: string | null;
  fixed_price: number | null;
  status: boolean;
  tenant_id: number;
}

export interface RepairReasonCreateInput {
  name: string;
  description?: string;
  fixed_price?: number | null;
  status?: boolean;
}

export interface RepairReasonUpdateInput {
  name?: string;
  description?: string;
  fixed_price?: number | null;
  status?: boolean;
}

export interface RepairReasonQueryInput {
  page?: number;
  limit?: number;
  search?: string;
  status?: boolean;
}

export interface RepairReasonListResponse {
  data: RepairReasonRecord[];
  message: string;
  status: number;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
