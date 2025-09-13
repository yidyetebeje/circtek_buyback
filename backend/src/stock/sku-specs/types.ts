import { t, type Static } from "elysia"

// SKU Specs-specific types and validation schemas
export const SkuSpecsCreate = t.Object({
  sku: t.String(),
  make: t.Optional(t.String()),
  model_no: t.Optional(t.String()),
  model_name: t.Optional(t.String()),
  is_part: t.Boolean({ default: false }),
  storage: t.Optional(t.String()),
  memory: t.Optional(t.String()),
  color: t.Optional(t.String()),
  device_type: t.Optional(t.Union([
    t.Literal('iPhone'),
    t.Literal('Macbook'),
    t.Literal('Airpods'),
    t.Literal('Android')
  ])),
  status: t.Optional(t.Boolean()),
})

export const SkuSpecsUpdate = t.Object({
  make: t.Optional(t.String()),
  model_no: t.Optional(t.String()),
  model_name: t.Optional(t.String()),
  is_part: t.Optional(t.Boolean()),
  storage: t.Optional(t.String()),
  memory: t.Optional(t.String()),
  color: t.Optional(t.String()),
  device_type: t.Optional(t.Union([
    t.Literal('iPhone'),
    t.Literal('Macbook'),
    t.Literal('Airpods'),
    t.Literal('Android')
  ])),
  status: t.Optional(t.Boolean()),
})

export const SkuSpecsQuery = t.Object({
  sku: t.Optional(t.String()),
  make: t.Optional(t.String()),
  model_no: t.Optional(t.String()),
  model_name: t.Optional(t.String()),
  device_type: t.Optional(t.String()),
  search: t.Optional(t.String()),
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
  sort_by: t.Optional(t.String()),
  sort_dir: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
})

export type SkuSpecsCreateInput = Static<typeof SkuSpecsCreate>
export type SkuSpecsUpdateInput = Static<typeof SkuSpecsUpdate>
export type SkuSpecsQueryInput = Static<typeof SkuSpecsQuery>

export type SkuSpecsRecord = {
  id: number
  sku: string
  make?: string | null
  model_no?: string | null
  model_name?: string | null
  is_part: boolean | null
  storage?: string | null
  memory?: string | null
  color?: string | null
  device_type?: 'iPhone' | 'Macbook' | 'Airpods' | 'Android' | null
  status: boolean | null
  tenant_id: number
  created_at: Date | null
  updated_at: Date | null
}

export type SkuSpecsListResult = {
  rows: SkuSpecsRecord[]
  total: number
  page: number
  limit: number
}
