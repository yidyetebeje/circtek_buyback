/**
 * Common API types for pagination, filtering, and sorting
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface ClientFilter {
  clientId?: number;
}

export interface QueryParams extends PaginationParams, SortParams, ClientFilter {
  // Re-add index signature, but allow arrays of numbers for multi-select
  [key: string]: string | number | boolean | number[] | undefined;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  total?: number; // Keep for backward compatibility
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface Translation {
  language_id: number;
  [key: string]: unknown;
}

// Generic request type for creating entity with translations
export interface CreateWithTranslationsRequest<T, U extends Translation> {
  entity: T;
  translations: U[];
}

// Generic request type for updating entity with translations
export interface UpdateWithTranslationsRequest<T, TTranslation> {
  entity: Partial<T>;
  translations: Partial<TTranslation>[];
}

export interface BulkUpsertResponse {
  success: boolean;
  message: string;
  createdCount: number;
  updatedCount: number;
}
