import { t, type Static } from 'elysia'

export const StockInRequest = t.Object({
  imei: t.String({ minLength: 1, description: 'Device IMEI' }),
  grade_id: t.Number({ description: 'Grade ID from grades table' }),
  warehouse_id: t.Number({ description: 'Warehouse ID where the device is being graded' }),
  remarks: t.Optional(t.String({ description: 'Optional remarks for the stock in operation' }))
})

export type StockInRequestInput = Static<typeof StockInRequest>

export type StockInResponse = {
  device_id: number
  imei: string
  grade_id: number
  grade_name: string
  grade_color: string
  device_grade_id: number
  event_id: number
  warehouse_id: number
  warehouse_name: string
  actor_id: number
  actor_name: string
  message: string
}
