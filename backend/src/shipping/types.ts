import { t, type Static } from 'elysia'

// ============ INPUT SCHEMAS ============

export const ShipmentItemCreate = t.Object({
    device_id: t.Optional(t.Number()),
    sku: t.Optional(t.String()),
    imei: t.Optional(t.String()),
    serial_number: t.Optional(t.String()),
    model_name: t.Optional(t.String()),
    quantity: t.Optional(t.Number({ default: 1 })),
    weight_kg: t.Optional(t.String({ default: '0.200' })),
    unit_value: t.Optional(t.String()),
    hs_code: t.Optional(t.String({ default: '851712' })), // Mobile phones
    description: t.Optional(t.String()),
})

export const RecipientInfo = t.Object({
    name: t.String(),
    company: t.Optional(t.String()),
    address: t.String(),
    house_number: t.String(),
    city: t.String(),
    postal_code: t.String(),
    country: t.String({ minLength: 2, maxLength: 2 }), // ISO 2-letter
    phone: t.Optional(t.String()),
    email: t.Optional(t.String()),
})

export const ShipmentCreate = t.Object({
    from_warehouse_id: t.Number(),
    to_warehouse_id: t.Optional(t.Number()), // For inter-warehouse transfers
    recipient: t.Optional(RecipientInfo), // For external deliveries
    items: t.Array(ShipmentItemCreate, { minItems: 1 }),
    parcel_type: t.Optional(t.Union([t.Literal('individual'), t.Literal('group')])),
    shipping_method_id: t.Optional(t.Number()),
    notes: t.Optional(t.String()),
    request_label: t.Optional(t.Boolean({ default: false })),
})

export const ShipmentUpdate = t.Object({
    recipient: t.Optional(RecipientInfo),
    notes: t.Optional(t.String()),
    status: t.Optional(t.String()),
})

export const ShipmentQuery = t.Object({
    from_warehouse_id: t.Optional(t.Number()),
    to_warehouse_id: t.Optional(t.Number()),
    status: t.Optional(t.String()),
    date_from: t.Optional(t.String()),
    date_to: t.Optional(t.String()),
    search: t.Optional(t.String()),
    page: t.Optional(t.Number({ default: 1 })),
    limit: t.Optional(t.Number({ default: 10 })),
    sort_by: t.Optional(t.String()),
    sort_dir: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
})

export const GenerateLabelRequest = t.Object({
    shipment_id: t.Number(),
    format: t.Optional(t.Union([t.Literal('a4'), t.Literal('a6')])),
    start_position: t.Optional(t.Number({ minimum: 0, maximum: 3 })),
})

export const SendcloudConfigCreate = t.Object({
    shop_id: t.Number(),
    public_key: t.String(),
    secret_key: t.String(), // Will be encrypted before storage
    default_sender_address_id: t.Optional(t.Number()),
    default_shipping_method_id: t.Optional(t.Number()), // v2 (deprecated)
    default_shipping_option_code: t.Optional(t.String()), // v3
    use_test_mode: t.Optional(t.Boolean({ default: false })),
    // HQ warehouse configuration for store transfers
    hq_warehouse_id: t.Optional(t.Number()), // Default destination warehouse for store transfers
    hq_delivery_address_id: t.Optional(t.Number()), // Sendcloud sender address ID for HQ delivery
})

// ============ TYPE EXPORTS ============

export type ShipmentItemCreateInput = Static<typeof ShipmentItemCreate>
export type RecipientInfoInput = Static<typeof RecipientInfo>
export type ShipmentCreateInput = Static<typeof ShipmentCreate>
export type ShipmentUpdateInput = Static<typeof ShipmentUpdate>
export type ShipmentQueryInput = Static<typeof ShipmentQuery>
export type GenerateLabelInput = Static<typeof GenerateLabelRequest>
export type SendcloudConfigInput = Static<typeof SendcloudConfigCreate>

// ============ RECORD TYPES ============

export type ShipmentStatus =
    | 'draft'
    | 'pending'
    | 'label_generated'
    | 'shipped'
    | 'in_transit'
    | 'delivered'
    | 'cancelled'
    | 'returned'

export type ParcelType = 'individual' | 'group'

export interface ShipmentRecord {
    id: number
    shipment_number: string
    sendcloud_parcel_id: number | null
    sendcloud_tracking_number: string | null
    sendcloud_tracking_url: string | null
    carrier_name: string | null
    shipping_method_id: number | null
    from_warehouse_id: number
    to_warehouse_id: number | null
    recipient_name: string | null
    recipient_company: string | null
    recipient_address: string | null
    recipient_house_number: string | null
    recipient_city: string | null
    recipient_postal_code: string | null
    recipient_country: string | null
    recipient_phone: string | null
    recipient_email: string | null
    parcel_type: ParcelType | null
    total_weight_kg: string | null
    total_items: number | null
    total_value: string | null
    label_url: string | null
    label_generated_at: Date | null
    status: ShipmentStatus | null
    shipped_at: Date | null
    delivered_at: Date | null
    notes: string | null
    created_by: number
    tenant_id: number
    created_at: Date | null
    updated_at: Date | null
}

export interface ShipmentItemRecord {
    id: number
    shipment_id: number
    device_id: number | null
    sku: string | null
    imei: string | null
    serial_number: string | null
    model_name: string | null
    quantity: number | null
    weight_kg: string | null
    unit_value: string | null
    hs_code: string | null
    description: string | null
    tenant_id: number
    created_at: Date | null
}

export interface ShipmentWithDetails extends ShipmentRecord {
    from_warehouse_name?: string
    to_warehouse_name?: string
    items: ShipmentItemRecord[]
    created_by_name?: string
}

export interface ShipmentListResult {
    rows: ShipmentWithDetails[]
    total: number
    page: number
    limit: number
}

export interface SendcloudConfigRecord {
    id: number
    tenant_id: number
    shop_id: number
    public_key: string
    secret_key_encrypted: string // AES-256-GCM encrypted
    default_sender_address_id: number | null
    default_shipping_method_id: number | null // v2 (deprecated)
    default_shipping_option_code: string | null // v3
    use_test_mode: boolean | null
    is_active: boolean | null
    // HQ warehouse configuration for store transfers
    hq_warehouse_id: number | null // Default destination warehouse for store transfers
    hq_delivery_address_id: number | null // Sendcloud sender address ID for HQ delivery
    created_at: Date | null
    updated_at: Date | null
}
