export interface RepairReasonRecord {
  id: number
  name: string
  description: string | null
  fixed_price: string | null
  status: boolean
  tenant_id: number
}

export interface RepairReasonCreateInput {
  name: string
  description?: string
  fixed_price?: number | null
  status?: boolean
}

export interface RepairReasonUpdateInput {
  name?: string
  description?: string
  fixed_price?: number | null
  status?: boolean
}

export interface RepairReasonQueryInput {
  page?: number
  limit?: number
  search?: string
  status?: boolean
  tenant_id?: number
}

export interface RepairReasonModelPriceRecord {
  id: number
  repair_reason_id: number
  model_name: string
  fixed_price: string
  status: boolean
  tenant_id: number
  created_at: Date | null
  updated_at: Date | null
}

export interface RepairReasonModelPriceCreateInput {
  repair_reason_id: number
  model_name: string
  fixed_price: number
  status?: boolean
}

export interface RepairReasonModelPriceUpdateInput {
  model_name?: string
  fixed_price?: number
  status?: boolean
}

export interface RepairReasonWithModelPrices extends RepairReasonRecord {
  model_prices: RepairReasonModelPriceRecord[]
}
