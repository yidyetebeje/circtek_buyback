export type SkuPropertyKey = 'make' | 'model_name' | 'storage' | 'original_color' | 'grade' | 'battery_cycle_count' | 'battery_health';

export interface SkuMappingCondition {
  propertyKey: SkuPropertyKey;
  propertyValue: string;
}

export interface SkuMapping {
  id: string;
  sku: string;
  conditions: Partial<Record<SkuPropertyKey, string>>;
  created_at: string;
  updated_at: string;
}

export interface CreateSkuMappingRequest {
  sku: string;
  conditions: Partial<Record<SkuPropertyKey, string>>;
}

export interface UpdateSkuMappingRequest {
  sku: string;
  conditions: Partial<Record<SkuPropertyKey, string>>;
}

export interface SkuMappingListResponse {
  data: SkuMapping[];
  message: string;
  status: number;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}