export interface RepairReasonRecord {
  id: number
  name: string
  description: string | null
  status: boolean
  tenant_id: number
}

export interface RepairReasonCreateInput {
  name: string
  description?: string
  status?: boolean
}

export interface RepairReasonUpdateInput {
  name?: string
  description?: string
  status?: boolean
}

export interface RepairReasonQueryInput {
  page?: number
  limit?: number
  search?: string
  status?: boolean
  tenant_id?: number
}
