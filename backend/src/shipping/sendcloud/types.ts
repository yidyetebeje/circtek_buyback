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
