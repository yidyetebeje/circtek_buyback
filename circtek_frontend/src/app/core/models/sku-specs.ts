export interface SkuSpecsRecord {
  id: number;
  sku: string;
  make?: string | null;
  model_no?: string | null;
  model_name?: string | null;
  is_part: boolean | null;
  storage?: string | null;
  memory?: string | null;
  color?: string | null;
  device_type?: 'iPhone' | 'Macbook' | 'Airpods' | 'Android' | null;
  status: boolean | null;
  tenant_id: number;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface SkuSpecsCreateInput {
  sku: string;
  make?: string;
  model_no?: string;
  model_name?: string;
  is_part: boolean;
  storage?: string;
  memory?: string;
  color?: string;
  device_type?: 'iPhone' | 'Macbook' | 'Airpods' | 'Android';
  status?: boolean;
}

export interface SkuSpecsUpdateInput {
  make?: string;
  model_no?: string;
  model_name?: string;
  is_part?: boolean;
  storage?: string;
  memory?: string;
  color?: string;
  device_type?: 'iPhone' | 'Macbook' | 'Airpods' | 'Android';
  status?: boolean;
}

export interface SkuSpecsQueryInput {
  sku?: string;
  make?: string;
  model_no?: string;
  model_name?: string;
  device_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SkuSpecsListResponse {
  data: SkuSpecsRecord[];
  message: string;
  status: number;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
