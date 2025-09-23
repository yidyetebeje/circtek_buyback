import { t, type Static } from 'elysia'

export const OtaUpdateCreate = t.Object({
    version: t.String(),
    url: t.String(),
    target_os: t.Union([t.Literal('window'), t.Literal('macos')]),
    target_architecture: t.Union([t.Literal('x86'), t.Literal('arm')]),
    release_channel: t.Union([t.Literal('stable'), t.Literal('beta'), t.Literal('dev')]),
})

export const OtaUpdateUpdate = t.Object({
    version: t.Optional(t.String()),
    url: t.Optional(t.String()),
    target_os: t.Optional(t.Union([t.Literal('window'), t.Literal('macos')])),
    target_architecture: t.Optional(t.Union([t.Literal('x86'), t.Literal('arm')])),
    release_channel: t.Optional(t.Union([t.Literal('stable'), t.Literal('beta'), t.Literal('dev')])),
})

export type OtaUpdateCreateInput = Static<typeof OtaUpdateCreate>
export type OtaUpdateUpdateInput = Static<typeof OtaUpdateUpdate>

export const VersionCheckRequest = t.Object({
    current_version: t.String(),
    target_os: t.Union([t.Literal('window'), t.Literal('macos')]),
    target_architecture: t.Union([t.Literal('x86'), t.Literal('arm'), t.Literal('aarch64'), t.Literal('arm64'), t.Literal('x64')]),
})

export type VersionCheckRequestInput = Static<typeof VersionCheckRequest>

export type VersionCheckResponse = {
    update_available: boolean
    current_version: string
    latest_version?: string
    download_url?: string
    message: string
}

export type OtaUpdatePublic = {
    id: number
    version: string
    url: string
    target_os: 'window' | 'macos'
    target_architecture: 'x86' | 'arm' | 'aarch64' | 'arm64' | 'x64'
    release_channel: 'stable' | 'beta' | 'dev'
    tenant_id: number
    tenant_name?: string | null
    created_at: string | null
    updated_at: string | null
}
