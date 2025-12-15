import type {
    SendcloudParcelInput,
    SendcloudParcel,
    SendcloudParcelsResponse,
    SendcloudShippingMethodsResponse,
    SendcloudSenderAddressesResponse,
    SendcloudApiError,
    LabelPrinterFormat,
    LabelStartPosition
} from './types'

const SENDCLOUD_BASE_URL = 'https://panel.sendcloud.sc/api/v2'

export class SendcloudClient {
    private authHeader: string

    constructor(
        private readonly publicKey: string,
        private readonly secretKey: string
    ) {
        // Create Basic Auth header
        const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString('base64')
        this.authHeader = `Basic ${credentials}`
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${SENDCLOUD_BASE_URL}${endpoint}`

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as SendcloudApiError
            throw new Error(
                `Sendcloud API error: ${response.status} - ${errorData.error?.message || response.statusText}`
            )
        }

        // For label downloads, return the buffer directly
        if (options.headers && (options.headers as Record<string, string>)['Accept'] === 'application/pdf') {
            return response.arrayBuffer() as unknown as T
        }

        return response.json()
    }

    // ============ PARCEL MANAGEMENT ============

    /**
     * Create a new parcel in Sendcloud
     * Set request_label: true to immediately generate a label
     */
    async createParcel(data: SendcloudParcelInput): Promise<SendcloudParcel> {
        const response = await this.request<SendcloudParcelsResponse>('/parcels', {
            method: 'POST',
            body: JSON.stringify({ parcel: data }),
        })

        if (!response.parcel) {
            throw new Error('Failed to create parcel: No parcel returned')
        }

        return response.parcel
    }

    /**
     * Update an existing parcel
     * Use this to request a label by setting request_label: true
     */
    async updateParcel(id: number, data: Partial<SendcloudParcelInput>): Promise<SendcloudParcel> {
        const response = await this.request<SendcloudParcelsResponse>(`/parcels/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ parcel: data }),
        })

        if (!response.parcel) {
            throw new Error('Failed to update parcel: No parcel returned')
        }

        return response.parcel
    }

    /**
     * Get a parcel by ID
     */
    async getParcel(id: number): Promise<SendcloudParcel> {
        const response = await this.request<SendcloudParcelsResponse>(`/parcels/${id}`)

        if (!response.parcel) {
            throw new Error('Parcel not found')
        }

        return response.parcel
    }

    /**
     * Cancel a parcel
     */
    async cancelParcel(id: number): Promise<void> {
        await this.request(`/parcels/${id}/cancel`, {
            method: 'POST',
        })
    }

    // ============ LABEL GENERATION ============

    /**
     * Request a label for an existing parcel
     */
    async requestLabel(parcelId: number): Promise<SendcloudParcel> {
        return this.updateParcel(parcelId, { request_label: true })
    }

    /**
     * Create a parcel and immediately request a label
     */
    async createParcelWithLabel(data: SendcloudParcelInput): Promise<SendcloudParcel> {
        return this.createParcel({
            ...data,
            request_label: true,
        })
    }

    /**
     * Download the label PDF for a parcel
     * @param parcelId - The Sendcloud parcel ID
     * @param format - 'a4' for normal printer (A4 page), 'a6' for label printer
     * @param startFrom - Position on A4 page (0-3), only used for a4 format
     */
    async getLabelPdf(
        parcelId: number,
        format: LabelPrinterFormat = 'a4',
        startFrom: LabelStartPosition = 0
    ): Promise<Buffer> {
        const printerType = format === 'a6' ? 'label_printer' : 'normal_printer'
        let endpoint = `/labels/${printerType}/${parcelId}`

        if (format === 'a4') {
            endpoint += `?start_from=${startFrom}`
        }

        const response = await fetch(`${SENDCLOUD_BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': this.authHeader,
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to download label: ${response.status} ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        return Buffer.from(arrayBuffer)
    }

    // ============ SHIPPING METHODS ============

    /**
     * Get all available shipping methods
     */
    async getShippingMethods(): Promise<SendcloudShippingMethodsResponse['shipping_methods']> {
        const response = await this.request<SendcloudShippingMethodsResponse>('/shipping_methods')
        return response.shipping_methods || []
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

    /**
     * Find a shipping method by ID
     */
    async getShippingMethodById(id: number): Promise<SendcloudShippingMethodsResponse['shipping_methods'][0] | undefined> {
        const methods = await this.getShippingMethods()
        return methods.find(m => m.id === id)
    }

    // ============ SENDER ADDRESSES ============

    /**
     * Get all sender addresses configured in Sendcloud
     */
    async getSenderAddresses(): Promise<SendcloudSenderAddressesResponse['sender_addresses']> {
        const response = await this.request<SendcloudSenderAddressesResponse>('/user/addresses/sender')
        return response.sender_addresses || []
    }

    /**
     * Get the default sender address (first one)
     */
    async getDefaultSenderAddress(): Promise<SendcloudSenderAddressesResponse['sender_addresses'][0] | undefined> {
        const addresses = await this.getSenderAddresses()
        return addresses[0]
    }
}

// Factory function to create client from config
export function createSendcloudClient(publicKey: string, secretKey: string): SendcloudClient {
    return new SendcloudClient(publicKey, secretKey)
}
