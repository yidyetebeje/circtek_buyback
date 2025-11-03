import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm'
import { db } from '../../db'
import { currency_symbols, tenant_currency_preferences } from '../../db/circtek.schema'
import type { 
    CurrencySymbolCreateInput, 
    CurrencySymbolPublic, 
    CurrencySymbolUpdateInput,
   
    TenantCurrencyPreferencePublic
} from './types'

const currencySymbolSelection = {
    id: currency_symbols.id,
    tenant_id: currency_symbols.tenant_id,
    code: currency_symbols.code,
    symbol: currency_symbols.symbol,
    label: currency_symbols.label,
    is_default: currency_symbols.is_default,
    is_active: currency_symbols.is_active,
    created_at: currency_symbols.created_at,
    created_by: currency_symbols.created_by,
    updated_at: currency_symbols.updated_at,
    updated_by: currency_symbols.updated_by,
}

const tenantPreferenceSelection = {
    tenant_id: tenant_currency_preferences.tenant_id,
    code: tenant_currency_preferences.currency_code,
    symbol: currency_symbols.symbol,
    updated_at: tenant_currency_preferences.updated_at,
}

export class CurrencySymbolsRepository {
    constructor(private readonly database: typeof db) {}

    // Currency Symbol operations
    async listByTenant(tenantId: number): Promise<CurrencySymbolPublic[]> {
        const rows = await this.database
            .select(currencySymbolSelection)
            .from(currency_symbols)
            .where(eq(currency_symbols.tenant_id, tenantId))
            .orderBy(desc(currency_symbols.is_default), asc(currency_symbols.code))
        
        return rows as CurrencySymbolPublic[]
    }

    async getById(tenantId: number, id: number): Promise<CurrencySymbolPublic | null> {
        const [row] = await this.database
            .select(currencySymbolSelection)
            .from(currency_symbols)
            .where(and(
                eq(currency_symbols.id, id), 
                eq(currency_symbols.tenant_id, tenantId)
            ))
        
        return row ? row as CurrencySymbolPublic : null
    }

    async getByCode(tenantId: number, code: string): Promise<CurrencySymbolPublic | null> {
        const [row] = await this.database
            .select(currencySymbolSelection)
            .from(currency_symbols)
            .where(and(
                eq(currency_symbols.code, code), 
                eq(currency_symbols.tenant_id, tenantId)
            ))
        
        return row ? row as CurrencySymbolPublic : null
    }

    async getDefault(tenantId: number): Promise<CurrencySymbolPublic | null> {
        const [row] = await this.database
            .select(currencySymbolSelection)
            .from(currency_symbols)
            .where(and(
                eq(currency_symbols.tenant_id, tenantId),
                eq(currency_symbols.is_default, true),
                eq(currency_symbols.is_active, true)
            ))
        
        return row ? row as CurrencySymbolPublic : null
    }

    async create(payload: CurrencySymbolCreateInput & { tenant_id: number }, actorId?: number): Promise<CurrencySymbolPublic | null> {
        const values = {
            ...payload,
            created_by: actorId || null,
            updated_by: actorId || null,
        }

        // If this should be the default, unset previous defaults
        if (payload.is_default) {
            await this.ensureSingleDefault(payload.tenant_id, null)
        }

        await this.database.insert(currency_symbols).values(values as any)
        
        // Get the created record
        return this.getByCode(payload.tenant_id, payload.code)
    }

    async update(tenantId: number, id: number, changes: CurrencySymbolUpdateInput, actorId?: number): Promise<CurrencySymbolPublic | null> {
        // Check if record exists and belongs to tenant
        const existing = await this.getById(tenantId, id)
        if (!existing) {
            return null
        }

        const values = {
            ...changes,
            updated_by: actorId || null,
        }

        // If setting as default, unset previous defaults
        if (changes.is_default === true) {
            await this.ensureSingleDefault(tenantId, id)
        }

        await this.database
            .update(currency_symbols)
            .set(values as any)
            .where(and(
                eq(currency_symbols.id, id), 
                eq(currency_symbols.tenant_id, tenantId)
            ))

        return this.getById(tenantId, id)
    }

    async remove(tenantId: number, id: number): Promise<{ success: boolean; error?: string }> {
        // Check if record exists and belongs to tenant
        const existing = await this.getById(tenantId, id)
        if (!existing) {
            return { success: false, error: 'Currency symbol not found or access denied' }
        }

        // Check if any users have this as their preference
        const [tenantWithPreference] = await this.database
            .select({ tenant_id: tenant_currency_preferences.tenant_id })
            .from(tenant_currency_preferences)
            .where(and(
                eq(tenant_currency_preferences.tenant_id, tenantId),
                eq(tenant_currency_preferences.currency_code, existing.code)
            ))
            .limit(1)

        if (tenantWithPreference) {
            return { 
                success: false, 
                error: 'Cannot delete currency symbol. It is currently set as preference by one or more tenants.' 
            }
        }

        try {
            await this.database
                .delete(currency_symbols)
                .where(and(
                    eq(currency_symbols.id, id), 
                    eq(currency_symbols.tenant_id, tenantId)
                ))
            
            return { success: true }
        } catch (error: any) {
            console.error('Failed to delete currency symbol:', error)
            return { 
                success: false, 
                error: 'Failed to delete currency symbol. It may be in use by the system.' 
            }
        }
    }

    async ensureSingleDefault(tenantId: number, idToKeepDefault: number | null): Promise<void> {
        // Unset all defaults for this tenant, except the one we want to keep
        const conditions = [eq(currency_symbols.tenant_id, tenantId)]
        if (idToKeepDefault !== null) {
            conditions.push(sql`${currency_symbols.id} != ${idToKeepDefault}`)
        }

        await this.database
            .update(currency_symbols)
            .set({ is_default: false })
            .where(and(...conditions))
    }

    // User Preference operations
    async getTenantPreference(tenantId: number): Promise<TenantCurrencyPreferencePublic | null> {
        const [row] = await this.database
            .select(tenantPreferenceSelection)
            .from(tenant_currency_preferences)
            .where(eq(tenantPreferenceSelection.tenant_id, tenantId))
            .leftJoin(currency_symbols, eq(tenant_currency_preferences.currency_code, currency_symbols.code))
        
        
        return row ? row as TenantCurrencyPreferencePublic : null
    }

    async upsertUserPreference(tenantId: number, userId: number, code: string): Promise<TenantCurrencyPreferencePublic> {
        // Check if the currency code exists and is active for this tenant
        const currencySymbol = await this.getByCode(tenantId, code)
        if (!currencySymbol || !currencySymbol.is_active) {
            throw new Error('Invalid or inactive currency code for this tenant')
        }

        console.log('Upserting user preference for:', { tenantId, userId, code });
        
        // Check if preference already exists
        const existing = await this.getTenantPreference(tenantId);
        
        if (existing) {
            // Update existing preference
            console.log('Updating existing preference');
            await this.database
                .update(tenant_currency_preferences)
                .set({ 
                    currency_code: code,
                    updated_at: sql`CURRENT_TIMESTAMP`
                })
                .where(and(
                    eq(tenant_currency_preferences.tenant_id, tenantId),
                ));
        } else {
            // Insert new preference
            console.log('Inserting new preference');
            await this.database
                .insert(tenant_currency_preferences)
                .values({
                    tenant_id: tenantId,
                    currency_code: code,
                } as any);
        }

        // Return the updated preference
        const preference = await this.getTenantPreference(tenantId)
        if (!preference) {
            throw new Error('Failed to create or update user preference')
        }
        
        return preference
    }

    
}