// Sendcloud API Types
// https://api.sendcloud.dev/docs/sendcloud-public-api/

export interface SendcloudParcelItem {
    description: string
    hs_code?: string // e.g., "851712" for mobile phones
    origin_country?: string // ISO 2-letter code
    product_id?: string
    properties?: Record<string, string>
    quantity: number
    sku?: string
    value: string // Decimal as string
    weight: string // kg as string
}

export interface SendcloudParcelInput {
    // Recipient info
    name: string
    company_name?: string
    email?: string
    telephone?: string
    address: string
    house_number: string
    address_2?: string
    city: string
    country: string // ISO 2-letter code
    postal_code: string
    country_state?: string | null

    // Parcel items (for customs)
    parcel_items?: SendcloudParcelItem[]

    // Dimensions and weight
    weight: string // Total weight in kg
    length?: string // cm
    width?: string // cm
    height?: string // cm

    // Order values
    total_order_value?: string
    total_order_value_currency?: string

    // Shipping method
    shipment?: {
        id: number
        name?: string
    }
    shipping_method_checkout_name?: string

    // Sender
    sender_address?: number

    // Label options
    request_label?: boolean
    request_label_async?: boolean
    apply_shipping_rules?: boolean

    // Other
    quantity?: number
    total_insured_value?: number
    is_return?: boolean
    customs_invoice_nr?: string
    customs_shipment_type?: number | null
    order_number?: string
    external_reference?: string
}

export interface SendcloudLabel {
    label_printer?: string
    normal_printer?: string[]
}

export interface SendcloudParcel {
    id: number
    name: string
    company_name?: string
    email?: string
    telephone?: string
    address: string
    house_number: string
    address_2?: string
    city: string
    country: {
        iso_2: string
        iso_3: string
        name: string
    }
    postal_code: string

    // Status
    status: {
        id: number
        message: string
    }

    // Tracking
    tracking_number?: string
    tracking_url?: string

    // Carrier
    carrier?: {
        code: string
    }

    // Shipment method
    shipment?: {
        id: number
        name: string
    }

    // Label
    label?: SendcloudLabel

    // Order
    order_number?: string
    external_reference?: string

    // Weight
    weight: string

    // Items
    parcel_items?: SendcloudParcelItem[]

    // Timestamps
    date_created?: string
    date_updated?: string
    date_announced?: string
}

export interface SendcloudParcelsResponse {
    parcel?: SendcloudParcel
    parcels?: SendcloudParcel[]
    error?: {
        code: number
        message: string
    }
}

export interface SendcloudShippingMethod {
    id: number
    name: string
    carrier: string
    min_weight: number
    max_weight: number
    service_point_input: string
    countries: Array<{
        id: number
        name: string
        iso_2: string
        iso_3: string
        from_country: string
        to_country: string
        price: number
    }>
}

export interface SendcloudShippingMethodsResponse {
    shipping_methods: SendcloudShippingMethod[]
}

export interface SendcloudSenderAddress {
    id: number
    company_name: string
    contact_name: string
    email: string
    telephone: string
    street: string
    house_number: string
    postal_code: string
    city: string
    country: string
}

export interface SendcloudSenderAddressesResponse {
    sender_addresses: SendcloudSenderAddress[]
}

export interface SendcloudApiError {
    error: {
        code: number
        message: string
        request?: string
    }
}

// Label format types
export type LabelPrinterFormat = 'a4' | 'a6'
export type LabelStartPosition = 0 | 1 | 2 | 3 // 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right

// ============ SENDCLOUD API V3 TYPES ============

/**
 * V3 Weight object format
 */
export interface SendcloudV3Weight {
    value: number
    unit: 'kg' | 'g' | 'lbs' | 'oz'
}

/**
 * V3 Address format - used for both sender and recipient
 * Field names match Sendcloud API v3 documentation
 */
export interface SendcloudV3Address {
    name: string
    company_name?: string
    email?: string
    phone_number?: string
    address_line_1: string
    address_line_2?: string
    house_number?: string
    city: string
    postal_code: string
    country_code: string // ISO-2 code
    state_province_code?: string // ISO state code, not city name!
    po_box?: string
}

/**
 * V3 Item format for customs/parcel contents
 */
export interface SendcloudV3Item {
    description: string
    quantity: number
    weight: string // kg as string for items
    value: string // decimal as string
    hs_code?: string
    origin_country?: string // ISO-2 code
    sku?: string
}

/**
 * V3 Parcel input (within a shipment)
 */
export interface SendcloudV3ParcelInput {
    weight: SendcloudV3Weight // V3 requires object, not string!
    length?: number // cm
    width?: number // cm
    height?: number // cm
    items?: SendcloudV3Item[]
}

/**
 * V3 ship_with properties when using shipping_option_code type
 */
export interface SendcloudV3ShipWithProperties {
    shipping_option_code: string // e.g., "postnl:standard" - get from shipping options endpoint
    contract_id?: number // Optional contract ID if you have multiple
}

/**
 * V3 ship_with object - specifies how to select shipping method
 * The type determines how the carrier is selected
 */
export interface SendcloudV3ShipWith {
    type: 'shipping_option_code' | 'shipping_product_code' // Type of selection method
    properties: SendcloudV3ShipWithProperties // Properties based on the type
}

/**
 * V3 Shipment input for creating shipments
 */
export interface SendcloudV3ShipmentInput {
    from_address: SendcloudV3Address // REQUIRED in V3!
    to_address: SendcloudV3Address
    parcels: SendcloudV3ParcelInput[]
    ship_with: SendcloudV3ShipWith // REQUIRED in V3! Has type + properties
    request_label?: boolean
    label_notes?: string
    order_number?: string
    external_reference?: string
    total_order_value?: string
    total_order_value_currency?: string
}

/**
 * V3 Document types available for download
 */
export interface SendcloudV3Document {
    type: 'label' | 'cn23' | 'commercial_invoice' | 'return_label'
    link: string
}

/**
 * V3 Parcel response
 */
export interface SendcloudV3Parcel {
    id: number
    tracking_number?: string
    tracking_url?: string
    carrier?: {
        code: string
        name: string
    }
    status?: {
        id: number
        message: string
    }
    documents?: SendcloudV3Document[]
    weight?: string
}

/**
 * V3 Shipment response
 */
export interface SendcloudV3ShipmentResponse {
    id: string
    parcels: SendcloudV3Parcel[]
    status: string
    external_reference?: string
    order_number?: string
    created_at?: string
}

/**
 * V3 Shipping option (replaces shipping method)
 */
export interface SendcloudV3ShippingOption {
    code: string
    name: string
    carrier: string
    min_weight?: number
    max_weight?: number
    countries?: Array<{
        from_country: string
        to_country: string
    }>
}

/**
 * V3 Compatibility response for mapping v2 method IDs to v3 codes
 */
export interface SendcloudV3CompatResponse {
    shipping_options: Array<{
        shipping_method_id: number
        code: string
        name: string
        carrier: string
    }>
}

/**
 * V3 API Error response
 */
export interface SendcloudV3ApiError {
    error?: {
        code: string
        message: string
        details?: Record<string, unknown>
    }
    errors?: Array<{
        code: string
        message: string
        field?: string
    }>
}

// Document format types for v3
export type SendcloudV3DocumentType = 'label' | 'cn23' | 'commercial_invoice' | 'return_label'
export type SendcloudV3LabelFormat = 'pdf' | 'png' | 'zpl'
export type SendcloudV3LabelSize = 'a4' | 'a5' | 'a6'

