import { t, type Static } from 'elysia'

export const WiFiProfileCreate = t.Object({
    name: t.String(),
    ssid: t.String(),
    password: t.String(),
    status: t.Optional(t.Boolean()),
})

export const WiFiProfileUpdate = t.Object({
    name: t.Optional(t.String()),
    ssid: t.Optional(t.String()),
    password: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
})

export type WiFiProfileCreateInput = Static<typeof WiFiProfileCreate> & { tenant_id?: number }
export type WiFiProfileUpdateInput = Static<typeof WiFiProfileUpdate> & { tenant_id?: number }

export type WiFiProfilePublic = {
    id: number
    name: string
    ssid: string
    password: string
    status: boolean | null
    tenant_id: number
    tenant_name?: string | null
    created_at: string | null
    updated_at: string | null
}


