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

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as SendcloudV3ApiError
            const errorMessage = errorData.error?.message
                || errorData.errors?.[0]?.message
                || response.statusText
            throw new Error(
                `Sendcloud API error: ${response.status} - ${errorMessage}`
            )
        }

        return response.json()
    }

    // ============ SHIPMENT MANAGEMENT (V3) ============

    /**
     * Create and announce a shipment synchronously
     * This creates the shipment and generates the label in one call
     */
    async createShipment(data: SendcloudV3ShipmentInput): Promise<SendcloudV3ShipmentResponse> {
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
