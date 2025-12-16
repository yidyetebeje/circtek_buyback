import { shippingRepository, ShippingRepository } from './repository'
import { createSendcloudClient, SendcloudClient } from './sendcloud/client'
import type { SendcloudV3ShipmentInput, SendcloudV3Item, SendcloudV3Document } from './sendcloud/types'
import type {
    ShipmentCreateInput,
    ShipmentUpdateInput,
    ShipmentQueryInput,
    GenerateLabelInput,
    SendcloudConfigInput,
    ShipmentWithDetails,
    SendcloudConfigRecord,
} from './types'

interface ControllerResponse<T = unknown> {
    data: T | null
    message: string
    status: number
    error?: string
}

export class ShippingController {
    constructor(private readonly repository: ShippingRepository) { }

    // ============ SENDCLOUD CLIENT ============

    private async getSendcloudClient(shop_id: number, tenant_id: number): Promise<SendcloudClient> {
        const config = await this.repository.getSendcloudConfigDecrypted(shop_id, tenant_id)
        if (!config) {
            throw new Error('Sendcloud not configured for this shop. Please configure API keys first.')
        }
        return createSendcloudClient(
            config.public_key,
            config.secret_key,
            config.use_test_mode ?? false
        )
    }

    // ============ SHIPMENT MANAGEMENT ============

    /**
     * Create a new shipment
     */
    async createShipment(
        data: ShipmentCreateInput,
        actor_id: number,
        shop_id: number,
        tenant_id: number
    ): Promise<ControllerResponse> {
        try {
            // Validate: must have either to_warehouse_id OR recipient
            if (!data.to_warehouse_id && !data.recipient) {
                return {
                    data: null,
                    message: 'Either to_warehouse_id or recipient information is required',
                    status: 400,
                }
            }

            const shipment = await this.repository.createShipment(data, actor_id, tenant_id)

            // If request_label is true, immediately generate label
            if (data.request_label) {
                const labelResult = await this.generateLabel(
                    { shipment_id: shipment.id, format: 'a4' },
                    shop_id,
                    tenant_id
                )
                if (labelResult.status !== 200) {
                    // Return shipment but note label failed
                    return {
                        data: await this.repository.findShipmentWithDetails(shipment.id, tenant_id),
                        message: `Shipment created but label generation failed: ${labelResult.message}`,
                        status: 201,
                    }
                }
            }

            const shipmentWithDetails = await this.repository.findShipmentWithDetails(shipment.id, tenant_id)

            return {
                data: shipmentWithDetails,
                message: 'Shipment created successfully',
                status: 201,
            }
        } catch (error) {
            return {
                data: null,
                message: 'Failed to create shipment',
                status: 500,
                error: (error as Error).message,
            }
        }
    }

    /**
     * Get a single shipment
     */
    async getShipment(id: number, tenant_id?: number): Promise<ControllerResponse> {
        try {
            const shipment = await this.repository.findShipmentWithDetails(id, tenant_id)
            if (!shipment) {
                return {
                    data: null,
                    message: 'Shipment not found',
                    status: 404,
                }
            }
            return {
                data: shipment,
                message: 'Shipment retrieved successfully',
                status: 200,
            }
        } catch (error) {
            return {
                data: null,
                message: 'Failed to retrieve shipment',
                status: 500,
                error: (error as Error).message,
            }
        }
    }

    /**
     * List shipments with filters
     */
    async listShipments(
        filters: ShipmentQueryInput,
        tenant_id?: number
    ): Promise<ControllerResponse> {
        try {
            const result = await this.repository.findAllShipments({ ...filters, tenant_id })
            return {
                data: result,
                message: 'Shipments retrieved successfully',
                status: 200,
            }
        } catch (error) {
            return {
                data: null,
                message: 'Failed to retrieve shipments',
                status: 500,
                error: (error as Error).message,
            }
        }
    }

    /**
     * Update a shipment
     */
    async updateShipment(
        id: number,
        data: ShipmentUpdateInput,
        tenant_id?: number
    ): Promise<ControllerResponse> {
        try {
            const existing = await this.repository.findShipmentById(id, tenant_id)
            if (!existing) {
                return {
                    data: null,
                    message: 'Shipment not found',
                    status: 404,
                }
            }

            const shipment = await this.repository.updateShipment(id, data, tenant_id)
            return {
                data: shipment,
                message: 'Shipment updated successfully',
                status: 200,
            }
        } catch (error) {
            return {
                data: null,
                message: 'Failed to update shipment',
                status: 500,
                error: (error as Error).message,
            }
        }
    }

    /**
     * Delete (cancel) a shipment
     */
    async deleteShipment(id: number, shop_id: number, tenant_id: number): Promise<ControllerResponse> {
        try {
            const existing = await this.repository.findShipmentById(id, tenant_id)
            if (!existing) {
                return {
                    data: null,
                    message: 'Shipment not found',
                    status: 404,
                }
            }

            // If already sent to Sendcloud, try to cancel there too
            if (existing.sendcloud_parcel_id) {
                try {
                    const client = await this.getSendcloudClient(shop_id, tenant_id)
                    await client.cancelParcel(existing.sendcloud_parcel_id)
                } catch (err) {
                    // Log but continue with local cancellation
                    console.error('Failed to cancel in Sendcloud:', err)
                }
            }

            await this.repository.deleteShipment(id, tenant_id)
            return {
                data: { id },
                message: 'Shipment cancelled successfully',
                status: 200,
            }
        } catch (error) {
            return {
                data: null,
                message: 'Failed to cancel shipment',
                status: 500,
                error: (error as Error).message,
            }
        }
    }

    // ============ LABEL GENERATION ============

    /**
     * Generate a shipping label via Sendcloud V3 API
     */
    async generateLabel(
        input: GenerateLabelInput,
        shop_id: number,
        tenant_id: number
    ): Promise<ControllerResponse> {
        try {
            const shipment = await this.repository.findShipmentWithDetails(input.shipment_id, tenant_id)
            if (!shipment) {
                return {
                    data: null,
                    message: 'Shipment not found',
                    status: 404,
                }
            }

            // Validate shipment has recipient info
            if (!shipment.recipient_name && !shipment.to_warehouse_id) {
                return {
                    data: null,
                    message: 'Shipment must have recipient information to generate label',
                    status: 400,
                }
            }

            const config = await this.repository.getSendcloudConfig(shop_id, tenant_id)
            if (!config) {
                return {
                    data: null,
                    message: 'Sendcloud not configured for this shop',
                    status: 400,
                }
            }

            const client = await this.getSendcloudClient(shop_id, tenant_id)

            // Build shipment data and create
            const shipmentData = this.buildShipment(shipment, config)
            const v3Response = await client.createShipment(shipmentData)

            // Get the first parcel from the response
            const parcel = v3Response.parcels?.[0]
            if (!parcel) {
                throw new Error('No parcel returned from Sendcloud')
            }

            // Find label document URL
            const labelDoc = parcel.documents?.find(d => d.type === 'label')

            // Update local shipment with Sendcloud data
            await this.repository.updateSendcloudData(shipment.id, {
                sendcloud_parcel_id: parcel.id,
                sendcloud_tracking_number: parcel.tracking_number,
                sendcloud_tracking_url: parcel.tracking_url,
                label_url: labelDoc?.link,
                carrier_name: parcel.carrier?.code || 'UPS',
                status: 'label_generated',
            }, tenant_id)

            const updatedShipment = await this.repository.findShipmentWithDetails(shipment.id, tenant_id)

            return {
                data: {
                    shipment: updatedShipment,
                    sendcloud_parcel: parcel,
                },
                message: 'Label generated successfully',
                status: 200,
            }
        } catch (error) {
            return {
                data: null,
                message: 'Failed to generate label',
                status: 500,
                error: (error as Error).message,
            }
        }
    }

    /**
     * Download label PDF
     */
    async downloadLabelPdf(
        shipment_id: number,
        format: 'a4' | 'a6' = 'a4',
        shop_id: number,
        tenant_id: number
    ): Promise<ControllerResponse<Buffer | null>> {
        try {
            const shipment = await this.repository.findShipmentById(shipment_id, tenant_id)
            if (!shipment) {
                return {
                    data: null,
                    message: 'Shipment not found',
                    status: 404,
                }
            }

            if (!shipment.sendcloud_parcel_id) {
                return {
                    data: null,
                    message: 'Label not yet generated. Please generate a label first.',
                    status: 400,
                }
            }

            const client = await this.getSendcloudClient(shop_id, tenant_id)
            const pdfBuffer = await client.getLabelPdf(shipment.sendcloud_parcel_id, format)

            return {
                data: pdfBuffer,
                message: 'Label PDF retrieved successfully',
                status: 200,
            }
        } catch (error) {
            return {
                data: null,
                message: 'Failed to download label PDF',
                status: 500,
                error: (error as Error).message,
            }
        }
    }

    /**
     * Build Sendcloud shipment input from shipment
     */
    private buildShipment(
        shipment: ShipmentWithDetails,
        config: SendcloudConfigRecord
    ): SendcloudV3ShipmentInput {
        // Convert items to Sendcloud V3 format
        const items: SendcloudV3Item[] = shipment.items.map(item => ({
            description: item.description || item.model_name || 'Mobile Phone',
            quantity: item.quantity || 1,
            weight: item.weight_kg || '0.200',
            value: item.unit_value || '100.00',
            hs_code: item.hs_code || '851712',
            sku: item.sku || undefined,
        }))

        // Parse weight as number for V3
        const weightValue = parseFloat(shipment.total_weight_kg || '0.5')

        return {
            // FROM: Source warehouse (where shipment originates)
            from_address: {
                name: 'Remarketed Warehouse', // TODO: Get from warehouse table
                address_line_1: 'Warehouse Street 1',
                city: 'Amsterdam',
                postal_code: '1000AA',
                country_code: 'NL',
            },
            // TO: Destination (recipient or warehouse)
            to_address: {
                name: shipment.recipient_name || 'Warehouse',
                company_name: shipment.recipient_company || undefined,
                email: shipment.recipient_email || undefined,
                phone_number: shipment.recipient_phone || undefined,
                address_line_1: shipment.recipient_address || '',
                house_number: shipment.recipient_house_number || undefined,
                city: shipment.recipient_city || '',
                postal_code: shipment.recipient_postal_code || '',
                country_code: shipment.recipient_country || 'NL',
            },
            parcels: [{
                weight: { value: weightValue, unit: 'kg' }, // V3 requires weight as object!
                items,
            }],
            ship_with: {
                type: 'shipping_option_code',
                properties: {
                    shipping_option_code: config.default_shipping_option_code || 'ups_standard',
                },
            },
            request_label: true,
            order_number: shipment.shipment_number,
            external_reference: String(shipment.id),
            total_order_value: shipment.total_value || '100.00',
            total_order_value_currency: 'EUR',
        }
    }

    // ============ SHIPPING METHODS ============

    /**
     * Get available UPS shipping methods
     */
    async getShippingMethods(shop_id: number, tenant_id: number): Promise<ControllerResponse> {
        try {
            const client = await this.getSendcloudClient(shop_id, tenant_id)
            const methods = await client.getUpsShippingMethods()
            return {
                data: methods,
                message: 'Shipping methods retrieved successfully',
                status: 200,
            }
        } catch (error) {
            return {
                data: null,
                message: 'Failed to retrieve shipping methods',
                status: 500,
                error: (error as Error).message,
            }
        }
    }

    /**
     * Get available shipping options from Sendcloud V3 API
     * These are valid shipping_option_codes for use in ship_with
     */
    async getShippingOptions(
        shop_id: number,
        tenant_id: number,
        from_country?: string,
        to_country?: string
    ): Promise<ControllerResponse> {
        try {
            const client = await this.getSendcloudClient(shop_id, tenant_id)
            const options = await client.getShippingOptions(from_country, to_country)
            return {
                data: options,
                message: 'Shipping options retrieved successfully',
                status: 200,
            }
        } catch (error) {
            return {
                data: null,
                message: 'Failed to retrieve shipping options',
                status: 500,
                error: (error as Error).message,
            }
        }
    }

    // ============ CONFIGURATION ============

    /**
     * Configure Sendcloud for a shop
     */
    async configureSendcloud(
        data: SendcloudConfigInput,
        tenant_id: number
    ): Promise<ControllerResponse> {
        try {
            // Only test credentials if secret_key is provided
            // (When updating existing config, secret_key might be empty to keep existing value)
            if (data.secret_key && data.secret_key.trim().length > 0) {
                const testClient = createSendcloudClient(data.public_key, data.secret_key)
                await testClient.getShippingMethods() // This will throw if credentials are invalid
            }

            await this.repository.saveSendcloudConfig(data, tenant_id)

            return {
                data: { configured: true, shop_id: data.shop_id },
                message: 'Sendcloud configured successfully',
                status: 200,
            }
        } catch (error) {
            return {
                data: null,
                message: 'Failed to configure Sendcloud',
                status: 500,
                error: (error as Error).message,
            }
        }
    }

    /**
     * Get Sendcloud configuration status for a shop
     */
    async getSendcloudConfig(shop_id: number, tenant_id: number): Promise<ControllerResponse> {
        try {
            const config = await this.repository.getSendcloudConfig(shop_id, tenant_id)
            if (!config) {
                return {
                    data: { configured: false, shop_id },
                    message: 'Sendcloud not configured for this shop',
                    status: 200,
                }
            }

            return {
                data: {
                    configured: true,
                    shop_id: config.shop_id,
                    public_key: config.public_key, // Include full public key for form prefill
                    default_sender_address_id: config.default_sender_address_id,
                    default_shipping_method_id: config.default_shipping_method_id,
                    default_shipping_option_code: config.default_shipping_option_code,
                    use_test_mode: config.use_test_mode,
                    is_active: config.is_active,
                    // Also include preview for display
                    public_key_preview: config.public_key.substring(0, 8) + '...',
                },
                message: 'Sendcloud configuration retrieved',
                status: 200,
            }
        } catch (error) {
            return {
                data: null,
                message: 'Failed to retrieve Sendcloud configuration',
                status: 500,
                error: (error as Error).message,
            }
        }
    }
}

// Export singleton instance
export const shippingController = new ShippingController(shippingRepository)
