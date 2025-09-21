import { t } from "elysia";

// API Key permissions removed - all keys have full access

// Validation schemas for API key operations
export const CreateApiKeyRequest = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  description: t.Optional(t.String({ maxLength: 1000 })),
  rate_limit: t.Optional(t.Number({ minimum: 1, maximum: 10000 })),
  expires_at: t.Optional(t.String({ format: 'date-time' })),
});

export const UpdateApiKeyRequest = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  description: t.Optional(t.String({ maxLength: 1000 })),
  rate_limit: t.Optional(t.Number({ minimum: 1, maximum: 10000 })),
  expires_at: t.Optional(t.String({ format: 'date-time' })),
  is_active: t.Optional(t.Boolean()),
});

export const RevokeApiKeyRequest = t.Object({
  reason: t.Optional(t.String({ maxLength: 1000 })),
});

export const ApiKeyListQuery = t.Object({
  page: t.Optional(t.Number({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20 })),
  is_active: t.Optional(t.Boolean()),
  search: t.Optional(t.String({ minLength: 1 })),
});

export const ApiKeyUsageQuery = t.Object({
  start_date: t.Optional(t.String({ format: 'date' })),
  end_date: t.Optional(t.String({ format: 'date' })),
  page: t.Optional(t.Number({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20 })),
});

// TypeScript interfaces for API key data
export interface ApiKey {
  id: number;
  name: string;
  description: string | null;
  key_hash: string;
  key_prefix: string;
  tenant_id: number;
  created_by: number;
  rate_limit: number;
  expires_at: Date | null;
  last_used_at: Date | null;
  last_used_ip: string | null;
  usage_count: number;
  is_active: boolean;
  revoked_at: Date | null;
  revoked_by: number | null;
  revoked_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKeyWithDetails extends ApiKey {
  tenant_name: string;
  created_by_name: string;
  created_by_email: string;
  revoked_by_name?: string;
}

export interface ApiKeyCreated {
  id: number;
  name: string;
  key: string; // Only returned once upon creation
  key_prefix: string;
  expires_at: Date | null;
  created_at: Date;
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

// Response interfaces
export interface CreateApiKeyResponse {
  data: ApiKeyCreated;
  message: string;
  status: number;
}

export interface ApiKeyListResponse {
  data: ApiKeyWithDetails[];
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

export interface ApiKeyValidationResult {
  valid: boolean;
  api_key?: ApiKey;
  tenant_id?: number;
  error?: string;
  rate_limited?: boolean;
}

// Context interface for authenticated requests
export interface ApiKeyContext {
  api_key: ApiKey;
  tenant_id: number;
}