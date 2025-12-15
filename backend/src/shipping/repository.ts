import { and, count, eq, like, or, SQL, gte, lte, desc, asc, sql } from 'drizzle-orm'
import { db } from '../db/index'
import { shipments, shipment_items, sendcloud_config, warehouses, users } from '../db/circtek.schema'
import type {
    ShipmentCreateInput,
    ShipmentUpdateInput,
    ShipmentQueryInput,
    ShipmentItemCreateInput,
    ShipmentRecord,
    ShipmentItemRecord,
    ShipmentWithDetails,
    ShipmentListResult,
    SendcloudConfigRecord,
    SendcloudConfigInput,
    ShipmentStatus,
} from './types'

export class ShippingRepository {
    constructor(private readonly database: typeof db) { }

    // ============ SHIPMENT CRUD ============

    /**
     * Generate a unique shipment number
     */
    async generateShipmentNumber(tenant_id: number): Promise<string> {
        const date = new Date()
        const datePrefix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`

        // Count today's shipments for this tenant
        const [result] = await this.database
            .select({ count: count() })
            .from(shipments)
            .where(
                and(
                    eq(shipments.tenant_id, tenant_id),
                    gte(shipments.created_at, sql`CURDATE()`)
                )
            )

        const sequence = (result?.count || 0) + 1
        return `SHP-${datePrefix}-${String(sequence).padStart(4, '0')}`
    }

    /**
     * Create a new shipment
     */
    async createShipment(
        data: ShipmentCreateInput,
        actor_id: number,
        tenant_id: number
    ): Promise<ShipmentRecord> {
        const shipment_number = await this.generateShipmentNumber(tenant_id)

        // Calculate totals
        const total_items = data.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        const total_weight = data.items.reduce((sum, item) => {
            const qty = item.quantity || 1
            const weight = parseFloat(item.weight_kg || '0.200')
            return sum + (qty * weight)
        }, 0)
        const total_value = data.items.reduce((sum, item) => {
            const qty = item.quantity || 1
            const value = parseFloat(item.unit_value || '0')
            return sum + (qty * value)
        }, 0)

        const [result] = await this.database.insert(shipments).values({
            shipment_number,
            from_warehouse_id: data.from_warehouse_id,
            to_warehouse_id: data.to_warehouse_id || null,
            recipient_name: data.recipient?.name || null,
            recipient_company: data.recipient?.company || null,
            recipient_address: data.recipient?.address || null,
            recipient_house_number: data.recipient?.house_number || null,
            recipient_city: data.recipient?.city || null,
            recipient_postal_code: data.recipient?.postal_code || null,
            recipient_country: data.recipient?.country || null,
            recipient_phone: data.recipient?.phone || null,
            recipient_email: data.recipient?.email || null,
            parcel_type: data.parcel_type || 'individual',
            shipping_method_id: data.shipping_method_id || null,
            total_items,
            total_weight_kg: String(total_weight),
            total_value: String(total_value),
            notes: data.notes || null,
            status: 'draft',
            created_by: actor_id,
            tenant_id,
        })

        const shipment_id = Number(result.insertId)

        // Create shipment items
        await this.addItems(shipment_id, data.items, tenant_id)

        return this.findShipmentById(shipment_id, tenant_id) as Promise<ShipmentRecord>
    }

    /**
     * Add items to a shipment
     */
    async addItems(
        shipment_id: number,
        items: ShipmentItemCreateInput[],
        tenant_id: number
    ): Promise<void> {
        if (items.length === 0) return

        const itemsToInsert = items.map(item => ({
            shipment_id,
            device_id: item.device_id || null,
            sku: item.sku || null,
            imei: item.imei || null,
            serial_number: item.serial_number || null,
            model_name: item.model_name || null,
            quantity: item.quantity || 1,
            weight_kg: item.weight_kg || '0.200',
            unit_value: item.unit_value || null,
            hs_code: item.hs_code || '851712',
            description: item.description || null,
            tenant_id,
        }))

        await this.database.insert(shipment_items).values(itemsToInsert)
    }

    /**
     * Get shipment items
     */
    async getShipmentItems(shipment_id: number, tenant_id?: number): Promise<ShipmentItemRecord[]> {
        const conditions: SQL[] = [eq(shipment_items.shipment_id, shipment_id)]
        if (tenant_id) {
            conditions.push(eq(shipment_items.tenant_id, tenant_id))
        }

        return this.database
            .select()
            .from(shipment_items)
            .where(and(...conditions))
    }

    /**
     * Find shipment by ID
     */
    async findShipmentById(id: number, tenant_id?: number): Promise<ShipmentRecord | undefined> {
        const conditions: SQL[] = [eq(shipments.id, id)]
        if (tenant_id) {
            conditions.push(eq(shipments.tenant_id, tenant_id))
        }

        const [shipment] = await this.database
            .select()
            .from(shipments)
            .where(and(...conditions))
            .limit(1)

        return shipment as ShipmentRecord | undefined
    }

    /**
     * Find shipment with full details
     */
    async findShipmentWithDetails(id: number, tenant_id?: number): Promise<ShipmentWithDetails | undefined> {
        const shipment = await this.findShipmentById(id, tenant_id)
        if (!shipment) return undefined

        // Get warehouse names
        const [fromWarehouse] = await this.database
            .select({ name: warehouses.name })
            .from(warehouses)
            .where(eq(warehouses.id, shipment.from_warehouse_id))
            .limit(1)

        let toWarehouseName: string | undefined
        if (shipment.to_warehouse_id) {
            const [toWarehouse] = await this.database
                .select({ name: warehouses.name })
                .from(warehouses)
                .where(eq(warehouses.id, shipment.to_warehouse_id))
                .limit(1)
            toWarehouseName = toWarehouse?.name
        }

        // Get creator name
        const [creator] = await this.database
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, shipment.created_by))
            .limit(1)

        // Get items
        const items = await this.getShipmentItems(id, tenant_id)

        return {
            ...shipment,
            from_warehouse_name: fromWarehouse?.name,
            to_warehouse_name: toWarehouseName,
            created_by_name: creator?.name,
            items,
        }
    }

    /**
     * Find all shipments with filtering and pagination
     */
    async findAllShipments(filters: ShipmentQueryInput & { tenant_id?: number }): Promise<ShipmentListResult> {
        const {
            from_warehouse_id,
            to_warehouse_id,
            status,
            date_from,
            date_to,
            search,
            page = 1,
            limit = 10,
            sort_by = 'created_at',
            sort_dir = 'desc',
            tenant_id,
        } = filters

        const conditions: SQL[] = []

        if (tenant_id) {
            conditions.push(eq(shipments.tenant_id, tenant_id))
        }
        if (from_warehouse_id) {
            conditions.push(eq(shipments.from_warehouse_id, from_warehouse_id))
        }
        if (to_warehouse_id) {
            conditions.push(eq(shipments.to_warehouse_id, to_warehouse_id))
        }
        if (status) {
            conditions.push(eq(shipments.status, status as ShipmentStatus))
        }
        if (date_from) {
            conditions.push(gte(shipments.created_at, new Date(date_from)))
        }
        if (date_to) {
            conditions.push(lte(shipments.created_at, new Date(date_to)))
        }
        if (search) {
            conditions.push(
                or(
                    like(shipments.shipment_number, `%${search}%`),
                    like(shipments.sendcloud_tracking_number, `%${search}%`),
                    like(shipments.recipient_name, `%${search}%`)
                )!
            )
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined

        // Get total count
        const [countResult] = await this.database
            .select({ total: count() })
            .from(shipments)
            .where(whereClause)

        const total = countResult?.total || 0

        // Get sorted column
        const sortColumn = this.getSortColumn(sort_by)
        const orderFn = sort_dir === 'asc' ? asc : desc

        // Get paginated results
        const offset = (page - 1) * limit
        const rows = await this.database
            .select()
            .from(shipments)
            .where(whereClause)
            .orderBy(orderFn(sortColumn))
            .limit(limit)
            .offset(offset)

        // Enrich with details
        const enrichedRows: ShipmentWithDetails[] = await Promise.all(
            rows.map(async (row) => {
                const items = await this.getShipmentItems(row.id, tenant_id)
                return { ...row, items } as ShipmentWithDetails
            })
        )

        return {
            rows: enrichedRows,
            total,
            page,
            limit,
        }
    }

    private getSortColumn(sortBy?: string) {
        switch (sortBy) {
            case 'shipment_number': return shipments.shipment_number
            case 'status': return shipments.status
            case 'total_items': return shipments.total_items
            default: return shipments.created_at
        }
    }

    /**
     * Update shipment
     */
    async updateShipment(
        id: number,
        data: ShipmentUpdateInput,
        tenant_id?: number
    ): Promise<ShipmentRecord | undefined> {
        const conditions: SQL[] = [eq(shipments.id, id)]
        if (tenant_id) {
            conditions.push(eq(shipments.tenant_id, tenant_id))
        }

        const updateData: Record<string, unknown> = {
            updated_at: new Date(),
        }

        if (data.recipient) {
            updateData.recipient_name = data.recipient.name
            updateData.recipient_company = data.recipient.company
            updateData.recipient_address = data.recipient.address
            updateData.recipient_house_number = data.recipient.house_number
            updateData.recipient_city = data.recipient.city
            updateData.recipient_postal_code = data.recipient.postal_code
            updateData.recipient_country = data.recipient.country
            updateData.recipient_phone = data.recipient.phone
            updateData.recipient_email = data.recipient.email
        }

        if (data.notes !== undefined) {
            updateData.notes = data.notes
        }

        if (data.status) {
            updateData.status = data.status
            if (data.status === 'shipped') {
                updateData.shipped_at = new Date()
            } else if (data.status === 'delivered') {
                updateData.delivered_at = new Date()
            }
        }

        await this.database
            .update(shipments)
            .set(updateData)
            .where(and(...conditions))

        return this.findShipmentById(id, tenant_id)
    }

    /**
     * Update shipment with Sendcloud data
     */
    async updateSendcloudData(
        id: number,
        data: {
            sendcloud_parcel_id?: number
            sendcloud_tracking_number?: string
            sendcloud_tracking_url?: string
            label_url?: string
            carrier_name?: string
            status?: ShipmentStatus
        },
        tenant_id?: number
    ): Promise<void> {
        const conditions: SQL[] = [eq(shipments.id, id)]
        if (tenant_id) {
            conditions.push(eq(shipments.tenant_id, tenant_id))
        }

        const updateData: Record<string, unknown> = {
            updated_at: new Date(),
        }

        if (data.sendcloud_parcel_id) updateData.sendcloud_parcel_id = data.sendcloud_parcel_id
        if (data.sendcloud_tracking_number) updateData.sendcloud_tracking_number = data.sendcloud_tracking_number
        if (data.sendcloud_tracking_url) updateData.sendcloud_tracking_url = data.sendcloud_tracking_url
        if (data.label_url) {
            updateData.label_url = data.label_url
            updateData.label_generated_at = new Date()
        }
        if (data.carrier_name) updateData.carrier_name = data.carrier_name
        if (data.status) updateData.status = data.status

        await this.database
            .update(shipments)
            .set(updateData)
            .where(and(...conditions))
    }

    /**
     * Delete shipment (soft delete by updating status)
     */
    async deleteShipment(id: number, tenant_id?: number): Promise<void> {
        const conditions: SQL[] = [eq(shipments.id, id)]
        if (tenant_id) {
            conditions.push(eq(shipments.tenant_id, tenant_id))
        }

        await this.database
            .update(shipments)
            .set({ status: 'cancelled', updated_at: new Date() })
            .where(and(...conditions))
    }

    // ============ SENDCLOUD CONFIG ============

    /**
     * Get Sendcloud config for a tenant
     */
    async getSendcloudConfig(tenant_id: number): Promise<SendcloudConfigRecord | null> {
        const [config] = await this.database
            .select()
            .from(sendcloud_config)
            .where(
                and(
                    eq(sendcloud_config.tenant_id, tenant_id),
                    eq(sendcloud_config.is_active, true)
                )
            )
            .limit(1)

        return config as SendcloudConfigRecord | null
    }

    /**
     * Save or update Sendcloud config
     */
    async saveSendcloudConfig(data: SendcloudConfigInput, tenant_id: number): Promise<void> {
        const existing = await this.getSendcloudConfig(tenant_id)

        if (existing) {
            await this.database
                .update(sendcloud_config)
                .set({
                    public_key: data.public_key,
                    secret_key: data.secret_key,
                    default_sender_address_id: data.default_sender_address_id || null,
                    default_shipping_method_id: data.default_shipping_method_id || null,
                    updated_at: new Date(),
                })
                .where(eq(sendcloud_config.id, existing.id))
        } else {
            await this.database.insert(sendcloud_config).values({
                tenant_id,
                public_key: data.public_key,
                secret_key: data.secret_key,
                default_sender_address_id: data.default_sender_address_id || null,
                default_shipping_method_id: data.default_shipping_method_id || null,
                is_active: true,
            })
        }
    }
}

// Export singleton instance
export const shippingRepository = new ShippingRepository(db)
