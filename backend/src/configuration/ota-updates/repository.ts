import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm'
import { db } from '../../db'
import { ota_update, users } from '../../db/circtek.schema'
import type { OtaUpdateCreateInput, OtaUpdatePublic, OtaUpdateUpdateInput } from './types'

const otaUpdateSelection = {
    id: ota_update.id,
    version: ota_update.version,
    url: ota_update.url,
    target_os: ota_update.target_os,
    target_architecture: ota_update.target_architecture,
    release_channel: ota_update.release_channel,
    created_at: ota_update.created_at,
    updated_at: ota_update.updated_at,
}

export class OtaUpdatesRepository {
    constructor(private readonly database: typeof db) {}

    async list(
        tenantId?: number | null,
        page: number = 1,
        limit: number = 10,
        search?: string,
        sortField?: string,
        sortOrder: 'asc' | 'desc' = 'desc'
    ): Promise<{ data: OtaUpdatePublic[]; total: number }> {
        // Build where conditions
        const conditions: any[] = []
        if (search) {
            conditions.push(
                or(
                    like(ota_update.version, `%${search}%`),
                    like(ota_update.url, `%${search}%`)
                )
            )
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined

        // Determine sort column
        let orderByColumn: any = ota_update.created_at
        if (sortField === 'version') orderByColumn = ota_update.version
        else if (sortField === 'target_os') orderByColumn = ota_update.target_os
        else if (sortField === 'target_architecture') orderByColumn = ota_update.target_architecture
        else if (sortField === 'release_channel') orderByColumn = ota_update.release_channel
        else if (sortField === 'url') orderByColumn = ota_update.url

        const orderByFn = sortOrder === 'asc' ? asc : desc

        // Get total count
        const countQuery = this.database
            .select({ count: sql<number>`count(*)` })
            .from(ota_update)
        
        if (whereClause) {
            countQuery.where(whereClause as any)
        }

        const [{ count }] = await countQuery
        const total = Number(count)

        // Get paginated data
        const offset = (page - 1) * limit
        const dataQuery = this.database
            .select(otaUpdateSelection)
            .from(ota_update)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByFn(orderByColumn))

        if (whereClause) {
            dataQuery.where(whereClause as any)
        }

        const rows = await dataQuery

        return {
            data: rows as any,
            total
        }
    }

    async create(payload: OtaUpdateCreateInput): Promise<OtaUpdatePublic | undefined> {
        await this.database.insert(ota_update).values(payload as any)
        const [created] = await this.database
            .select(otaUpdateSelection)
            .from(ota_update)
            .where(eq(ota_update.version, payload.version) as any)
            .orderBy(desc(ota_update.id))
            .limit(1)
        return created as any
    }

    async get(id: number): Promise<OtaUpdatePublic | undefined> {
        const [row] = await this.database
            .select(otaUpdateSelection)
            .from(ota_update)
            .where(eq(ota_update.id, id) as any)
        return row as any
    }

    async update(id: number, payload: OtaUpdateUpdateInput): Promise<OtaUpdatePublic | undefined> {
        const body = payload as any
        await this.database.update(ota_update).set(body as any).where(eq(ota_update.id, id) as any)
        return this.get(id)
    }

    async delete(id: number): Promise<{ success: boolean; error?: string }> {
        const [existing] = await this.database.select({ id: ota_update.id }).from(ota_update).where(eq(ota_update.id, id) as any)
        if (!existing) return { success: false, error: 'OTA update not found' }
        
        // Check if any users are assigned to this OTA update
        const [assignedUser] = await this.database
            .select({ id: users.id, user_name: users.user_name })
            .from(users)
            .where(eq(users.ota_update_id, id))
            .limit(1)
        
        if (assignedUser) {
            return { 
                success: false, 
                error: 'Cannot delete OTA update. It is currently assigned to one or more testers. Please unassign all testers first.' 
            }
        }
        
        try {
            await this.database.delete(ota_update).where(eq(ota_update.id, id))
            return { success: true }
        } catch (error: any) {
            console.error('Failed to delete OTA update:', error)
            return { 
                success: false, 
                error: 'Failed to delete OTA update. It may be in use by the system.' 
            }
        }
    }

    // Assignment methods
    async ensureSameTenantForUserAndOta(userId: number, otaUpdateId: number, tenantId: number): Promise<boolean> {
        const [userRow] = await this.database.select({ tenant_id: users.tenant_id }).from(users).where(eq(users.id, userId))
        return Boolean(userRow && userRow.tenant_id === tenantId)
    }

    async setUserOtaUpdate(userId: number, otaUpdateId: number | null): Promise<void> {
        await this.database.update(users).set({ ota_update_id: otaUpdateId as any }).where(eq(users.id, userId))
    }

    async listTesters(otaUpdateId: number, tenantId: number) {
        const rows = await this.database
            .select({ id: users.id, user_name: users.user_name, name: users.name})
            .from(users)
            .where(and(eq(users.ota_update_id, otaUpdateId), eq(users.tenant_id, tenantId)) as any)
        return rows
    }

    async getByTesterId(testerId: number, tenantId: number): Promise<OtaUpdatePublic | null> {
        const [row] = await this.database
            .select(otaUpdateSelection)
            .from(ota_update)
            .innerJoin(users, and(
                eq(users.ota_update_id, ota_update.id),
                eq(users.id, testerId),
                eq(users.tenant_id, tenantId)
            ))
        return row as any ?? null
    }

    async checkForUpdate(testerId: number, tenantId: number, currentVersion: string, targetOs: string, targetArchitecture: string): Promise<OtaUpdatePublic | null> {
        if (targetArchitecture === 'aarch64') {
            targetArchitecture = 'arm'
        }
        const [row] = await this.database
            .select(otaUpdateSelection)
            .from(ota_update)
            .innerJoin(users, and(
                eq(users.ota_update_id, ota_update.id),
                eq(users.id, testerId),
                eq(users.tenant_id, tenantId)
            ))
            .where(and(
                eq(ota_update.target_os, targetOs as any),
                eq(ota_update.target_architecture, targetArchitecture as any)
            ))
        
        if (!row) return null
        
        // Compare versions - if the assigned OTA update version is greater than current version
        if (this.isVersionGreater(row.version, currentVersion)) {
            return row as any
        }
        
        return null
    }

    private isVersionGreater(version1: string, version2: string): boolean {
        // Simple semantic versioning comparison
        // Split versions into parts and compare numerically
        const v1Parts = version1.split('.').map(part => parseInt(part.replace(/[^0-9]/g, ''), 10) || 0)
        const v2Parts = version2.split('.').map(part => parseInt(part.replace(/[^0-9]/g, ''), 10) || 0)
        
        // Pad arrays to same length
        const maxLength = Math.max(v1Parts.length, v2Parts.length)
        while (v1Parts.length < maxLength) v1Parts.push(0)
        while (v2Parts.length < maxLength) v2Parts.push(0)
        
        // Compare each part
        for (let i = 0; i < maxLength; i++) {
            if (v1Parts[i] > v2Parts[i]) return true
            if (v1Parts[i] < v2Parts[i]) return false
        }
        
        return false // versions are equal
    }
}
