import { t, type Static } from 'elysia'

export const CurrencySymbolCreate = t.Object({
    code: t.String({ 
        minLength: 2, 
        maxLength: 10,
        pattern: '^[A-Z]{2,10}$',
        error: 'Code must be 2-10 uppercase letters (e.g., USD, EUR)'
    }),
    symbol: t.String({ 
        minLength: 1, 
        maxLength: 10,
        error: 'Symbol must be 1-10 characters (e.g., $, €)'
    }),
    label: t.String({ 
        minLength: 2, 
        maxLength: 100,
        error: 'Label must be 2-100 characters (e.g., US Dollar, Euro)'
    }),
    is_default: t.Optional(t.Boolean()),
    is_active: t.Optional(t.Boolean()),
})

export const CurrencySymbolUpdate = t.Object({
    code: t.Optional(t.String({ 
        minLength: 2, 
        maxLength: 10,
        pattern: '^[A-Z]{2,10}$',
        error: 'Code must be 2-10 uppercase letters (e.g., USD, EUR)'
    })),
    symbol: t.Optional(t.String({ 
        minLength: 1, 
        maxLength: 10,
        error: 'Symbol must be 1-10 characters (e.g., $, €)'
    })),
    label: t.Optional(t.String({ 
        minLength: 2, 
        maxLength: 100,
        error: 'Label must be 2-100 characters (e.g., US Dollar, Euro)'
    })),
    is_default: t.Optional(t.Boolean()),
    is_active: t.Optional(t.Boolean()),
})

export const CurrencyPreferenceUpdate = t.Object({
    code: t.String({ 
        minLength: 2, 
        maxLength: 10,
        pattern: '^[A-Z]{2,10}$',
        error: 'Code must be 2-10 uppercase letters (e.g., USD, EUR)'
    }),
})

export type CurrencySymbolCreateInput = Static<typeof CurrencySymbolCreate> & { tenant_id?: number }
export type CurrencySymbolUpdateInput = Static<typeof CurrencySymbolUpdate> & { tenant_id?: number }
export type CurrencyPreferenceUpdateInput = Static<typeof CurrencyPreferenceUpdate>

export type CurrencySymbolPublic = {
    id: number
    tenant_id: number
    code: string
    symbol: string
    label: string
    is_default: boolean
    is_active: boolean
    created_at: string | null
    created_by: number | null
    updated_at: string | null
    updated_by: number | null
}

export type UserCurrencyPreferencePublic = {
    user_id: number
    tenant_id: number
    currency_code: string
    updated_at: string | null
}

export type CurrencyResolvedPublic = {
    code: string
    symbol: string
    source: 'user' | 'tenant_default' | 'system_default'
}