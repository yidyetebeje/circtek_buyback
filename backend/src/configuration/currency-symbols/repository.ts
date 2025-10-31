import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm'
import { db } from '../../db'
import { currency_symbols, user_currency_preferences } from '../../db/circtek.schema'
import type { 
    CurrencySymbolCreateInput, 
    CurrencySymbolPublic, 
    CurrencySymbolUpdateInput,
    UserCurrencyPreferencePublic,
    CurrencyResolvedPublic
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

const userPreferenceSelection = {
    user_id: user_currency_preferences.user_id,
    tenant_id: user_currency_preferences.tenant_id,
    currency_code: user_currency_preferences.currency_code,
    updated_at: user_currency_preferences.updated_at,
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
        const [userWithPreference] = await this.database
            .select({ user_id: user_currency_preferences.user_id })
            .from(user_currency_preferences)
            .where(and(
                eq(user_currency_preferences.tenant_id, tenantId),
                eq(user_currency_preferences.currency_code, existing.code)
            ))
            .limit(1)

        if (userWithPreference) {
            return { 
                success: false, 
                error: 'Cannot delete currency symbol. It is currently set as preference by one or more users.' 
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
    async getUserPreference(tenantId: number, userId: number): Promise<UserCurrencyPreferencePublic | null> {
        const [row] = await this.database
            .select(userPreferenceSelection)
            .from(user_currency_preferences)
            .where(and(
                eq(user_currency_preferences.tenant_id, tenantId),
                eq(user_currency_preferences.user_id, userId)
            ))
        
        return row ? row as UserCurrencyPreferencePublic : null
    }

    async upsertUserPreference(tenantId: number, userId: number, code: string): Promise<UserCurrencyPreferencePublic> {
        // Check if the currency code exists and is active for this tenant
        const currencySymbol = await this.getByCode(tenantId, code)
        if (!currencySymbol || !currencySymbol.is_active) {
            throw new Error('Invalid or inactive currency code for this tenant')
        }

        console.log('Upserting user preference for:', { tenantId, userId, code });
        
        // Check if preference already exists
        const existing = await this.getUserPreference(tenantId, userId);
        
        if (existing) {
            // Update existing preference
            console.log('Updating existing preference');
            await this.database
                .update(user_currency_preferences)
                .set({ 
                    currency_code: code,
                    updated_at: sql`CURRENT_TIMESTAMP`
                })
                .where(and(
                    eq(user_currency_preferences.tenant_id, tenantId),
                    eq(user_currency_preferences.user_id, userId)
                ));
        } else {
            // Insert new preference
            console.log('Inserting new preference');
            await this.database
                .insert(user_currency_preferences)
                .values({
                    tenant_id: tenantId,
                    user_id: userId,
                    currency_code: code,
                });
        }

        // Return the updated preference
        const preference = await this.getUserPreference(tenantId, userId)
        if (!preference) {
            throw new Error('Failed to create or update user preference')
        }
        
        return preference
    }

    async resolveForUser(tenantId: number, userId: number): Promise<CurrencyResolvedPublic> {
        // 1. Check user preference
        const userPreference = await this.getUserPreference(tenantId, userId)
        if (userPreference) {
            const currencySymbol = await this.getByCode(tenantId, userPreference.currency_code)
            if (currencySymbol && currencySymbol.is_active) {
                return {
                    code: currencySymbol.code,
                    symbol: currencySymbol.symbol,
                    source: 'user'
                }
            }
        }

        // 2. Check tenant default
        const tenantDefault = await this.getDefault(tenantId)
        if (tenantDefault) {
            return {
                code: tenantDefault.code,
                symbol: tenantDefault.symbol,
                source: 'tenant_default'
            }
        }

        // 3. System fallback
        return {
            code: 'USD',
            symbol: '$',
            source: 'system_default'
        }
    }
}