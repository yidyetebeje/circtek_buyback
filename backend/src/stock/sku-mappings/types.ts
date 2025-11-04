import { t, type Static } from "elysia"

// Allowed property keys for SKU mapping conditions
export const SkuPropertyKeys = ['make', 'model_name', 'storage', 'original_color', 'grade'] as const
export type SkuPropertyKey = typeof SkuPropertyKeys[number]

// SKU mapping create/update schema
export const SkuMappingCreate = t.Object({
  sku: t.String({ minLength: 1, maxLength: 255 }),
  conditions: t.Record(
    t.String(), // property key 
    t.String({ minLength: 1 }) // property value
  ),
})

export const SkuMappingUpdate = t.Object({
  sku: t.String({ minLength: 1, maxLength: 255 }),
  conditions: t.Record(
    t.String(), // property key
    t.String({ minLength: 1 }) // property value
  ),
})

// Query parameters for listing SKU mappings
export const SkuMappingQuery = t.Object({
  search: t.Optional(t.String()),
  sku: t.Optional(t.String()),
  page: t.Optional(t.Number({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 1000, default: 10 })),
})

// Path parameters
export const SkuMappingParams = t.Object({
  id: t.String({ format: 'uuid' }),
})

// TypeScript types
export type SkuMappingCreateInput = Static<typeof SkuMappingCreate>
export type SkuMappingUpdateInput = Static<typeof SkuMappingUpdate>
export type SkuMappingQueryInput = Static<typeof SkuMappingQuery>
export type SkuMappingParamsInput = Static<typeof SkuMappingParams>

// Database record type
export type SkuMappingRecord = {
  id: string
  sku: string
  conditions: Record<string, string>
  canonical_key: string
  tenant_id: number
  created_at: Date | null
  updated_at: Date | null
}

// API response type
export type SkuMappingResponse = {
  id: string
  sku: string
  conditions: Record<SkuPropertyKey, string>
  created_at: string
  updated_at: string
}

// List response
export type SkuMappingListResponse = {
  data: SkuMappingResponse[]
  message: string
  status: number
  meta?: {
    total: number
    page: number
    limit: number
  }
}

// Validation error details
export type ValidationError = {
  field: string
  message: string
  value?: any
}

// Create/update validation result
export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
}

// Canonical key utility type
export type CanonicalKeyBuilder = {
  build: (conditions: Record<string, string>) => string
  normalize: (key: string, value: string) => { key: string; value: string }
}