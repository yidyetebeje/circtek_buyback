import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { tenants, users, wifi_profile } from '../../db/circtek.schema'
import type { WiFiProfileCreateInput, WiFiProfilePublic, WiFiProfileUpdateInput } from './types'

const wifiProfileSelection = {
    id: wifi_profile.id,
    name: wifi_profile.name,
    ssid: wifi_profile.ssid,
    password: wifi_profile.password,
    status: wifi_profile.status,
    tenant_id: wifi_profile.tenant_id,
    tenant_name: tenants.name,
    created_at: wifi_profile.created_at,
    updated_at: wifi_profile.updated_at,
}

export class WiFiProfilesRepository {
    constructor(private readonly database: typeof db) {}

    async list(tenantId?: number | null): Promise<WiFiProfilePublic[]> {
        if (tenantId == null) {
            const rows = await this.database
                .select(wifiProfileSelection)
                .from(wifi_profile)
                .leftJoin(tenants, eq(wifi_profile.tenant_id, tenants.id))
                .orderBy(desc(wifi_profile.updated_at))
            return rows as any
        }
        const rows = await this.database
            .select(wifiProfileSelection)
            .from(wifi_profile)
            .leftJoin(tenants, eq(wifi_profile.tenant_id, tenants.id))
            .where(eq(wifi_profile.tenant_id, tenantId))
            .orderBy(desc(wifi_profile.updated_at))
        return rows as any
    }

    async create(payload: WiFiProfileCreateInput & { tenant_id: number }): Promise<WiFiProfilePublic | undefined> {
        await this.database.insert(wifi_profile).values(payload as any)
        const [created] = await this.database
            .select(wifiProfileSelection)
            .from(wifi_profile)
            .leftJoin(tenants, eq(wifi_profile.tenant_id, tenants.id))
            .where(and(eq(wifi_profile.name, payload.name), eq(wifi_profile.tenant_id, payload.tenant_id)) as any)
        return created as any
    }

    async get(id: number, tenantId: number): Promise<WiFiProfilePublic | undefined> {
        const [row] = await this.database
            .select(wifiProfileSelection)
            .from(wifi_profile)
            .leftJoin(tenants, eq(wifi_profile.tenant_id, tenants.id))
            .where(and(eq(wifi_profile.id, id), eq(wifi_profile.tenant_id, tenantId)) as any)
        return row as any
    }

    async update(id: number, payload: WiFiProfileUpdateInput, tenantId: number): Promise<WiFiProfilePublic | undefined> {
        const { tenant_id, ...body } = payload as any
        await this.database.update(wifi_profile).set(body as any).where(and(eq(wifi_profile.id, id), eq(wifi_profile.tenant_id, tenantId)) as any)
        return this.get(id, tenantId)
    }

    async delete(id: number, tenantId: number): Promise<boolean> {
        const [existing] = await this.database.select({ id: wifi_profile.id }).from(wifi_profile).where(and(eq(wifi_profile.id, id), eq(wifi_profile.tenant_id, tenantId)) as any)
        if (!existing) return false
        await this.database.delete(wifi_profile).where(eq(wifi_profile.id, id))
        return true
    }

    async ensureSameTenantForUserAndWiFi(userId: number, wifiProfileId: number, tenantId: number): Promise<boolean> {
        const [userRow] = await this.database.select({ tenant_id: users.tenant_id }).from(users).where(eq(users.id, userId))
        const [wifiRow] = await this.database.select({ tenant_id: wifi_profile.tenant_id }).from(wifi_profile).where(eq(wifi_profile.id, wifiProfileId))
        return Boolean(userRow && wifiRow && userRow.tenant_id === tenantId && wifiRow.tenant_id === tenantId)
    }

    async setUserWiFiProfile(userId: number, wifiProfileId: number | null): Promise<void> {
        await this.database.update(users).set({ wifi_profile_id: wifiProfileId as any }).where(eq(users.id, userId))
    }

    async listTesters(wifiProfileId: number, tenantId: number) {
        const rows = await this.database
            .select({ id: users.id, user_name: users.user_name, name: users.name })
            .from(users)
            .where(and(eq(users.wifi_profile_id, wifiProfileId), eq(users.tenant_id, tenantId)) as any)
        return rows
    }

    async getByTesterId(testerId: number, tenantId: number): Promise<WiFiProfilePublic | null> {
        const [row] = await this.database
            .select(wifiProfileSelection)
            .from(wifi_profile)
            .leftJoin(tenants, eq(wifi_profile.tenant_id, tenants.id))
            .innerJoin(users, and(
                eq(users.wifi_profile_id, wifi_profile.id),
                eq(users.id, testerId),
                eq(users.tenant_id, tenantId)
            ))
            .where(eq(wifi_profile.tenant_id, tenantId))
        return row as any ?? null
    }
}


