import type {
    SendcloudShippingMethodsResponse,
    // V3 Types
    SendcloudV3ShipmentInput,
    SendcloudV3ShipmentResponse,
    SendcloudV3DocumentType,
    SendcloudV3LabelFormat,
    SendcloudV3LabelSize,
    SendcloudV3ApiError,
} from './types'

// API URLs - V3 Only
const SENDCLOUD_V3_URL = 'https://panel.sendcloud.sc/api/v3'
const SENDCLOUD_V3_MOCK_URL = 'https://stoplight.io/mocks/sendcloud/sendcloud-public-api/299107077'

// V2 URL for endpoints not yet available in v3 (shipping methods, sender addresses)
const SENDCLOUD_V2_URL = 'https://panel.sendcloud.sc/api/v2'

export class SendcloudClient {
    private authHeader: string
    private v3BaseUrl: string

    constructor(
        private readonly publicKey: string,
        private readonly secretKey: string,
        private readonly useTestMode: boolean = false
    ) {
        // Create Basic Auth header
        const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString('base64')
        this.authHeader = `Basic ${credentials}`

        // Set base URL - use mock server in test mode
        this.v3BaseUrl = useTestMode ? SENDCLOUD_V3_MOCK_URL : SENDCLOUD_V3_URL
    }

    // ============ V3 REQUEST METHOD ============

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.v3BaseUrl}${endpoint}`

        // Debug: Log the request details
        console.log(`[Sendcloud] Request: ${options.method || 'GET'} ${url}`)
        if (options.body) {
            console.log('[Sendcloud] Request Body:', options.body)
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Sendcloud] Error Response Status:', response.status)
            console.error('[Sendcloud] Error Response Body:', errorText)

            // Try to parse as JSON for structured error
            let errorData: SendcloudV3ApiError = {}
            try {
                errorData = JSON.parse(errorText)
            } catch {
                // Not JSON, use raw text
            }

            const errorMessage = errorData.error?.message
                || errorData.errors?.[0]?.message
                || errorText
                || response.statusText

            throw new Error(
                `Sendcloud API error: ${response.status} - ${errorMessage}`
            )
        }

        const responseData = await response.json()
        console.log('[Sendcloud] Response:', JSON.stringify(responseData, null, 2))
        return responseData
    }

    // ============ SHIPPING PRODUCTS (V2) ============

    /**
     * Get available shipping products from Sendcloud V2
     * V3 doesn't have a shipping products list endpoint, so we use V2
     * @param fromCountry - ISO-2 country code for origin (e.g., "NL", "ET") - defaults to NL
     * @param toCountry - ISO-2 country code for destination (e.g., "NL") - defaults to NL
     */
    async getShippingOptions(fromCountry: string = 'NL', toCountry: string = 'NL'): Promise<any> {
        // Use V2 API for shipping-products (not available in V3)
        const params = new URLSearchParams()
        params.append('from_country', fromCountry)
        params.append('to_country', toCountry)

        const url = `${SENDCLOUD_V2_URL}/shipping-products?${params.toString()}`

        console.log(`[Sendcloud] Fetching shipping products (V2): ${url}`)

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Sendcloud] V2 Error Response Status:', response.status)
            console.error('[Sendcloud] V2 Error Response Body:', errorText)
            throw new Error(`Sendcloud V2 API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log('[Sendcloud] V2 Shipping Products Response:', JSON.stringify(data, null, 2))
        return data
    }

    // ============ PARCEL CREATION (V2) ============

    /**
     * Create a parcel with label using V2 API
     * Use this if V3 announce returns "User not allowed to announce"
     */
    async createParcelV2(parcelData: any): Promise<any> {
        const url = `${SENDCLOUD_V2_URL}/parcels`

        console.log('[Sendcloud] Creating V2 parcel with data:', JSON.stringify(parcelData, null, 2))

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ parcel: parcelData }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Sendcloud] V2 Parcel Error Status:', response.status)
            console.error('[Sendcloud] V2 Parcel Error Body:', errorText)
            throw new Error(`Sendcloud V2 parcel error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log('[Sendcloud] V2 Parcel Response:', JSON.stringify(data, null, 2))
        return data.parcel
    }

    // ============ SHIPMENT MANAGEMENT (V3) ============

    /**
     * Create and announce a shipment synchronously (V3)
     * NOTE: Requires V3 API permissions on Sendcloud account
     * If you get "User not allowed to announce", use createParcelV2 instead
     */
    async createShipment(data: SendcloudV3ShipmentInput): Promise<SendcloudV3ShipmentResponse> {
        console.log('[Sendcloud] Creating V3 shipment with data:', JSON.stringify(data, null, 2))
        return this.request<SendcloudV3ShipmentResponse>('/shipments/announce', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    /**
     * Cancel a parcel/shipment
     */
    async cancelParcel(id: number): Promise<void> {
        await this.request(`/parcels/${id}/cancel`, {
            method: 'POST',
        })
    }

    // ============ LABEL/DOCUMENT DOWNLOAD (V3) ============

    /**
     * Get a parcel document (label, customs form, etc.)
     * @param parcelId - The Sendcloud parcel ID
     * @param type - Document type: 'label', 'cn23', 'commercial_invoice', 'return_label'
     * @param format - Output format: 'pdf', 'png', 'zpl'
     * @param size - Paper size: 'a4', 'a5', 'a6'
     */
    async getParcelDocument(
        parcelId: number,
        type: SendcloudV3DocumentType = 'label',
        format: SendcloudV3LabelFormat = 'pdf',
        size: SendcloudV3LabelSize = 'a6'
    ): Promise<Buffer> {
        const endpoint = `/parcels/${parcelId}/documents/${type}?format=${format}&size=${size}`
        const response = await fetch(`${this.v3BaseUrl}${endpoint}`, {
            headers: {
                'Authorization': this.authHeader,
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to download document: ${response.status} ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        return Buffer.from(arrayBuffer)
    }

    /**
     * Download label PDF (convenience method)
     */
    async getLabelPdf(
        parcelId: number,
        size: SendcloudV3LabelSize = 'a6'
    ): Promise<Buffer> {
        return this.getParcelDocument(parcelId, 'label', 'pdf', size)
    }

    // ============ SHIPPING METHODS & SENDER ADDRESSES ============
    // Note: These still use v2 as v3 equivalents use different structure (shipping products)

    /**
     * Get all available shipping methods
     * Note: Uses v2 endpoint - v3 uses shipping products instead
     */
    async getShippingMethods(): Promise<SendcloudShippingMethodsResponse['shipping_methods']> {
        const url = `${SENDCLOUD_V2_URL}/shipping_methods`
        const response = await fetch(url, {
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to get shipping methods: ${response.status}`)
        }

        const data = await response.json() as SendcloudShippingMethodsResponse
        return data.shipping_methods || []
    }

    /**
     * Get UPS shipping methods only
     */
    async getUpsShippingMethods(): Promise<SendcloudShippingMethodsResponse['shipping_methods']> {
        const methods = await this.getShippingMethods()
        return methods.filter(method =>
            method.carrier.toLowerCase().includes('ups')
        )
    }

    // ============ UTILITY METHODS ============

    /**
     * Check if client is in test mode
     */
    isTestMode(): boolean {
        return this.useTestMode
    }
}

// Factory function to create client from config
export function createSendcloudClient(
    publicKey: string,
    secretKey: string,
    useTestMode: boolean = false
): SendcloudClient {
    return new SendcloudClient(publicKey, secretKey, useTestMode)
}
