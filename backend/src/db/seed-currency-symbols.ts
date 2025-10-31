import { db } from './index'
import { currency_symbols, tenants } from './circtek.schema'
import { eq, sql } from 'drizzle-orm'

/**
 * Seed default currency symbols for all tenants
 * This is idempotent - it won't overwrite existing data
 */
export async function seedCurrencySymbols() {
    console.log('🏦 Seeding default currency symbols...')
    
    try {
        // Get all tenants
        const existingTenants = await db.select({ id: tenants.id }).from(tenants)
        
        if (existingTenants.length === 0) {
            console.log('ℹ️  No tenants found, skipping currency symbol seeding')
            return
        }

        // Default currency symbols to create
        const defaultCurrencySymbols = [
            {
                code: 'USD',
                symbol: '$',
                label: 'US Dollar',
                is_default: true,
                is_active: true,
            },
            {
                code: 'EUR',
                symbol: '€',
                label: 'Euro',
                is_default: false,
                is_active: true,
            },
            {
                code: 'GBP',
                symbol: '£',
                label: 'British Pound',
                is_default: false,
                is_active: true,
            },
            {
                code: 'CAD',
                symbol: 'C$',
                label: 'Canadian Dollar',
                is_default: false,
                is_active: true,
            },
            {
                code: 'AUD',
                symbol: 'A$',
                label: 'Australian Dollar',
                is_default: false,
                is_active: true,
            },
            {
                code: 'JPY',
                symbol: '¥',
                label: 'Japanese Yen',
                is_default: false,
                is_active: true,
            },
            {
                code: 'AED',
                symbol: 'AED',
                label: 'United Arab Emirates Dirham',
                is_default: false,
                is_active: true,
            }
        ]

        for (const tenant of existingTenants) {
            console.log(`Processing tenant ID: ${tenant.id}`)
            
            // Check if this tenant already has currency symbols
            const [existingSymbol] = await db
                .select({ id: currency_symbols.id })
                .from(currency_symbols)
                .where(eq(currency_symbols.tenant_id, tenant.id))
                .limit(1)
            
            if (existingSymbol) {
                console.log(`  ✅ Tenant ${tenant.id} already has currency symbols, skipping`)
                continue
            }

            // Insert default currency symbols for this tenant
            const symbolsToInsert = defaultCurrencySymbols.map(symbol => ({
                tenant_id: tenant.id,
                code: symbol.code,
                symbol: symbol.symbol,
                label: symbol.label,
                is_default: symbol.is_default,
                is_active: symbol.is_active,
                created_by: null, // System seeded
                updated_by: null, // System seeded
            }))

            await db.insert(currency_symbols).values(symbolsToInsert)
            console.log(`  ✅ Created ${symbolsToInsert.length} currency symbols for tenant ${tenant.id}`)
        }
        
        console.log('✅ Currency symbols seeding completed successfully')
    } catch (error) {
        console.error('❌ Failed to seed currency symbols:', error)
        throw error
    }
}

// Run independently if called directly
if (require.main === module) {
    seedCurrencySymbols()
        .then(() => {
            console.log('Done!')
            process.exit(0)
        })
        .catch((error) => {
            console.error('Error:', error)
            process.exit(1)
        })
}