import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { ota_update, users, tenants } from '../../db/circtek.schema'
import type { OtaUpdateCreateInput, OtaUpdatePublic, OtaUpdateUpdateInput } from './types'

const otaUpdateSelection = {
    id: ota_update.id,
    version: ota_update.version,
    url: ota_update.url,
    target_os: ota_update.target_os,
    target_architecture: ota_update.target_architecture,
    release_channel: ota_update.release_channel,
    tenant_id: ota_update.tenant_id,
    tenant_name: tenants.name,
    created_at: ota_update.created_at,
    updated_at: ota_update.updated_at,
}

export class OtaUpdatesRepository {
    constructor(private readonly database: typeof db) {}

    async list(tenantId?: number | null): Promise<OtaUpdatePublic[]> {
        if (tenantId == null) {
            const rows = await this.database
                .select(otaUpdateSelection)
                .from(ota_update)
                .leftJoin(tenants, eq(ota_update.tenant_id, tenants.id))
                .orderBy(desc(ota_update.created_at))
            return rows as any
        }
        const rows = await this.database
            .select(otaUpdateSelection)
            .from(ota_update)
            .leftJoin(tenants, eq(ota_update.tenant_id, tenants.id))
            .where(eq(ota_update.tenant_id, tenantId))
            .orderBy(desc(ota_update.created_at))
        return rows as any
    }

    async create(payload: OtaUpdateCreateInput & { tenant_id: number }): Promise<OtaUpdatePublic | undefined> {
        await this.database.insert(ota_update).values(payload as any)
        const [created] = await this.database
            .select(otaUpdateSelection)
            .from(ota_update)
            .leftJoin(tenants, eq(ota_update.tenant_id, tenants.id))
            .where(and(
                eq(ota_update.version, payload.version),
                eq(ota_update.tenant_id, payload.tenant_id)
            ) as any)
        return created as any
    }

    async get(id: number, tenantId: number): Promise<OtaUpdatePublic | undefined> {
        const [row] = await this.database
            .select(otaUpdateSelection)
            .from(ota_update)
            .leftJoin(tenants, eq(ota_update.tenant_id, tenants.id))
            .where(and(eq(ota_update.id, id), eq(ota_update.tenant_id, tenantId)) as any)
        return row as any
    }

    async update(id: number, payload: OtaUpdateUpdateInput, tenantId: number): Promise<OtaUpdatePublic | undefined> {
        const { tenant_id, ...body } = payload as any
        await this.database.update(ota_update).set(body as any).where(and(eq(ota_update.id, id), eq(ota_update.tenant_id, tenantId)) as any)
        return this.get(id, tenantId)
    }

    async delete(id: number, tenantId: number): Promise<boolean> {
        const [existing] = await this.database.select({ id: ota_update.id }).from(ota_update).where(and(eq(ota_update.id, id), eq(ota_update.tenant_id, tenantId)) as any)
        if (!existing) return false
        await this.database.delete(ota_update).where(eq(ota_update.id, id))
        return true
    }

    // Assignment methods
    async ensureSameTenantForUserAndOta(userId: number, otaUpdateId: number, tenantId: number): Promise<boolean> {
        const [userRow] = await this.database.select({ tenant_id: users.tenant_id }).from(users).where(eq(users.id, userId))
        const [otaRow] = await this.database.select({ tenant_id: ota_update.tenant_id }).from(ota_update).where(eq(ota_update.id, otaUpdateId))
        return Boolean(userRow && otaRow && userRow.tenant_id === tenantId && otaRow.tenant_id === tenantId)
    }

    async setUserOtaUpdate(userId: number, otaUpdateId: number | null): Promise<void> {
        await this.database.update(users).set({ ota_update_id: otaUpdateId as any }).where(eq(users.id, userId))
    }

    async listTesters(otaUpdateId: number, tenantId: number) {
        const rows = await this.database
            .select({ id: users.id, user_name: users.user_name, name: users.name, email: users.email })
            .from(users)
            .where(and(eq(users.ota_update_id, otaUpdateId), eq(users.tenant_id, tenantId)) as any)
        return rows
    }

    async getByTesterId(testerId: number, tenantId: number): Promise<OtaUpdatePublic | null> {
        const [row] = await this.database
            .select(otaUpdateSelection)
            .from(ota_update)
            .leftJoin(tenants, eq(ota_update.tenant_id, tenants.id))
            .innerJoin(users, and(
                eq(users.ota_update_id, ota_update.id),
                eq(users.id, testerId),
                eq(users.tenant_id, tenantId)
            ))
            .where(eq(ota_update.tenant_id, tenantId))
        return row as any ?? null
    }

    async checkForUpdate(testerId: number, tenantId: number, currentVersion: string, targetOs: string, targetArchitecture: string): Promise<OtaUpdatePublic | null> {
        const [row] = await this.database
            .select(otaUpdateSelection)
            .from(ota_update)
            .leftJoin(tenants, eq(ota_update.tenant_id, tenants.id))
            .innerJoin(users, and(
                eq(users.ota_update_id, ota_update.id),
                eq(users.id, testerId),
                eq(users.tenant_id, tenantId)
            ))
            .where(and(
                eq(ota_update.tenant_id, tenantId),
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
