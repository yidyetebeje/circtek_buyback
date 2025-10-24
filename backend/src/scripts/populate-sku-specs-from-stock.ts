import { db } from '../db'
import { stock, sku_specs, devices } from '../db/circtek.schema'
import { eq, and, notInArray, sql } from 'drizzle-orm'

/**
 * Populate sku_specs from stock table
 * 
 * This script finds all SKUs in the stock table that don't exist in sku_specs,
 * gets their specifications from the devices table, and creates entries in sku_specs.
 * 
 * Usage:
 *   bun run src/scripts/populate-sku-specs-from-stock.ts [tenant-id]
 * 
 * Examples:
 *   bun run src/scripts/populate-sku-specs-from-stock.ts        # Process all tenants
 *   bun run src/scripts/populate-sku-specs-from-stock.ts 1      # Process tenant ID 1 only
 */

interface SkuInfo {
  sku: string
  is_part: boolean
  tenant_id: number
  make: string | null
  model_no: string | null
  model_name: string | null
  storage: string | null
  memory: string | null
  color: string | null
  device_type: 'iPhone' | 'Macbook' | 'Airpods' | 'Android' | null
}

interface ProcessStats {
  totalStockSkus: number
  existingSkuSpecs: number
  missingSkuSpecs: number
  skusWithoutDeviceInfo: number
  created: number
  errors: Array<{ sku: string; error: string }>
}

/**
 * Get all unique SKUs from stock table for a tenant
 */
async function getStockSkus(tenantId?: number): Promise<Array<{ sku: string; is_part: boolean; tenant_id: number }>> {
  const whereConditions = tenantId
    ? and(eq(stock.status, true), eq(stock.tenant_id, tenantId))
    : eq(stock.status, true)

  return await db
    .selectDistinct({
      sku: stock.sku,
      is_part: sql<boolean>`COALESCE(${stock.is_part}, false)`,
      tenant_id: stock.tenant_id,
    })
    .from(stock)
    .where(whereConditions)
}

/**
 * Get existing SKUs in sku_specs for a tenant
 */
async function getExistingSkuSpecs(tenantId?: number): Promise<Set<string>> {
  const whereConditions = tenantId
    ? and(eq(sku_specs.status, true), eq(sku_specs.tenant_id, tenantId))
    : eq(sku_specs.status, true)

  const results = await db
    .select({ sku: sku_specs.sku })
    .from(sku_specs)
    .where(whereConditions)

  return new Set(results.map(r => r.sku))
}

/**
 * Get device specifications for a SKU and tenant
 * This gets the most recent device with this SKU
 */
async function getDeviceSpecsForSku(sku: string, tenantId: number): Promise<Omit<SkuInfo, 'sku' | 'is_part' | 'tenant_id'> | null> {
  const result = await db
    .select({
      make: devices.make,
      model_no: devices.model_no,
      model_name: devices.model_name,
      storage: devices.storage,
      memory: devices.memory,
      color: devices.color,
      device_type: devices.device_type,
    })
    .from(devices)
    .where(
      and(
        eq(devices.sku, sku),
        eq(devices.tenant_id, tenantId),
        eq(devices.status, true)
      )
    )
    .orderBy(devices.created_at)
    .limit(1)

  if (result.length === 0) {
    return null
  }

  return result[0]
}

/**
 * Create a sku_spec entry
 */
async function createSkuSpec(skuInfo: SkuInfo): Promise<void> {
  await db.insert(sku_specs).values({
    sku: skuInfo.sku,
    make: skuInfo.make,
    model_no: skuInfo.model_no,
    model_name: skuInfo.model_name,
    is_part: skuInfo.is_part,
    storage: skuInfo.storage,
    memory: skuInfo.memory,
    color: skuInfo.color,
    device_type: skuInfo.device_type,
    tenant_id: skuInfo.tenant_id,
    status: true,
  })
}

/**
 * Process SKUs for a specific tenant or all tenants
 */
async function processSkus(tenantId?: number): Promise<ProcessStats> {
  const stats: ProcessStats = {
    totalStockSkus: 0,
    existingSkuSpecs: 0,
    missingSkuSpecs: 0,
    skusWithoutDeviceInfo: 0,
    created: 0,
    errors: [],
  }

  console.log('📦 Fetching stock SKUs...')
  const stockSkus = await getStockSkus(tenantId)
  stats.totalStockSkus = stockSkus.length
  console.log(`✅ Found ${stockSkus.length} unique SKUs in stock\n`)

  console.log('🔍 Fetching existing sku_specs...')
  const existingSkuSet = await getExistingSkuSpecs(tenantId)
  stats.existingSkuSpecs = existingSkuSet.size
  console.log(`✅ Found ${existingSkuSet.size} existing sku_specs\n`)

  // Filter out SKUs that already exist in sku_specs
  const missingSkus = stockSkus.filter(s => !existingSkuSet.has(s.sku))
  stats.missingSkuSpecs = missingSkus.length

  if (missingSkus.length === 0) {
    console.log('✨ All stock SKUs already have sku_specs entries!')
    return stats
  }

  console.log(`🔧 Processing ${missingSkus.length} missing SKUs...\n`)

  // Process each missing SKU
  for (const stockSku of missingSkus) {
    try {
      // Get device specifications for this SKU
      const deviceSpecs = await getDeviceSpecsForSku(stockSku.sku, stockSku.tenant_id)

      if (!deviceSpecs) {
        stats.skusWithoutDeviceInfo++
        console.log(`⚠️  SKU ${stockSku.sku} (Tenant ${stockSku.tenant_id}): No device found - creating with minimal info`)
        
        // Create with minimal information (just SKU and is_part)
        await createSkuSpec({
          sku: stockSku.sku,
          is_part: stockSku.is_part,
          tenant_id: stockSku.tenant_id,
          make: null,
          model_no: null,
          model_name: null,
          storage: null,
          memory: null,
          color: null,
          device_type: null,
        })
        stats.created++
      } else {
        // Create with full specifications
        await createSkuSpec({
          sku: stockSku.sku,
          is_part: stockSku.is_part,
          tenant_id: stockSku.tenant_id,
          ...deviceSpecs,
        })
        stats.created++
        console.log(`✅ Created sku_spec for ${stockSku.sku} (Tenant ${stockSku.tenant_id}): ${deviceSpecs.model_name || 'N/A'}`)
      }
    } catch (error) {
      stats.errors.push({
        sku: stockSku.sku,
        error: error instanceof Error ? error.message : String(error),
      })
      console.error(`❌ Error processing SKU ${stockSku.sku} (Tenant ${stockSku.tenant_id}): ${error}`)
    }
  }

  return stats
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  let tenantId: number | undefined

  if (args.length > 0) {
    tenantId = parseInt(args[0], 10)
    if (isNaN(tenantId)) {
      console.error('❌ Error: tenant-id must be a valid number')
      process.exit(1)
    }
  }

  console.log('🚀 Starting sku_specs population from stock...\n')
  console.log('📋 Configuration:')
  if (tenantId) {
    console.log(`   Tenant ID: ${tenantId}`)
  } else {
    console.log(`   Tenant ID: All tenants`)
  }
  console.log('')

  const startTime = Date.now()

  try {
    const stats = await processSkus(tenantId)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n' + '='.repeat(60))
    console.log('📊 Population Summary')
    console.log('='.repeat(60))
    console.log(`📦 Total stock SKUs: ${stats.totalStockSkus}`)
    console.log(`✅ Already in sku_specs: ${stats.existingSkuSpecs}`)
    console.log(`🔍 Missing in sku_specs: ${stats.missingSkuSpecs}`)
    console.log(`⚠️  SKUs without device info: ${stats.skusWithoutDeviceInfo}`)
    console.log(`✨ Newly created: ${stats.created}`)
    console.log(`❌ Errors: ${stats.errors.length}`)
    console.log(`⏱️  Duration: ${duration}s`)

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:')
      stats.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. SKU ${err.sku}: ${err.error}`)
      })
    }

    console.log('\n✨ Population completed!')
    process.exit(0)
  } catch (error) {
    console.error('\n💥 Fatal error during population:')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()
