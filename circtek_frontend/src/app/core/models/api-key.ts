export interface ApiKey {
  id: number;
  name: string;
  description: string | null;
  key_prefix: string;
  key_display?: string;
  tenant_id: number;
  tenant_name?: string;
  created_by: number;
  created_by_name?: string;
  created_by_email?: string;
  rate_limit: number;
  expires_at: Date | null;
  last_used_at: Date | null;
  last_used_ip: string | null;
  usage_count: number;
  is_active: boolean;
  revoked_at: Date | null;
  revoked_by: number | null;
  revoked_by_name?: string;
  revoked_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKeyCreated {
  id: number;
  name: string;
  key: string; // Only returned once upon creation
  key_prefix: string;
  expires_at: Date | null;
  created_at: Date;
}

export interface ApiKeyCreateRequest {
  name: string;
  description?: string;
  rate_limit?: number;
  expires_at?: string;
  tenant_id: number; // Required for super_admin
}

export interface ApiKeyUpdateRequest {
  name?: string;
  description?: string;
  rate_limit?: number;
  expires_at?: string;
  is_active?: boolean;
}

export interface ApiKeyRevokeRequest {
  reason?: string;
}

export interface ApiKeyUsageLog {
  id: number;
  api_key_id: number;
  tenant_id: number;
  endpoint: string;
  method: string;
  ip_address: string | null;
  user_agent: string | null;
  request_size: number | null;
  response_status: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: Date;
}

export interface ApiKeyUsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number | null;
  last_7_days: number;
  last_24_hours: number;
  rate_limit_hits: number;
}

export interface ApiKeyListResponse {
  data: ApiKey[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  message: string;
  status: number;
}

export interface ApiKeyUsageResponse {
  data: {
    usage_logs: ApiKeyUsageLog[];
    stats: ApiKeyUsageStats;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  message: string;
  status: number;
}
