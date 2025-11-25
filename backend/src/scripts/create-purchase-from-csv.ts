import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Create a single purchase order from a CSV file containing SKU items
 * 
 * CSV Format: SKU,Required Quantity,Current Stock,Shortage,Status,Priority,Price
 * Note: Items with price 0 will be ignored
 * 
 * Usage:
 *   bun run src/scripts/create-purchase-from-csv.ts <csv-file-path> <warehouse-id> <tenant-id> [--supplier=<supplier-name>] [--api-url=http://localhost:3000] [--dry-run] [--token=<auth-token>]
 * 
 * Example:
 *   bun run src/scripts/create-purchase-from-csv.ts parts-to-purchase-missing-with-prices.csv 1 2 --supplier="Parts Supplier"
 *   bun run src/scripts/create-purchase-from-csv.ts parts-to-purchase-missing-with-prices.csv 1 2 --supplier="Parts Supplier" --dry-run
 * 
 * Arguments:
 *   csv-file-path: Path to the CSV file (relative to backend directory)
 *   warehouse-id: The warehouse ID where items will be received
 *   tenant-id: The tenant ID for the purchase
 *   --supplier: Optional supplier name (default: "CSV Import Supplier")
 *   --api-url: Optional base URL of the API (default: https://api.circtek.io)
 *   --dry-run: Optional flag to preview what would be imported without making requests
 *   --token: Optional authentication token
 */

interface PurchaseItem {
    sku: string
    quantity: number
    price: number
    is_part: boolean
}

interface ImportStats {
    totalItems: number
    totalValue: number
    itemsWithPrice: number
    itemsIgnored: number
    ignoredItems: Array<{ sku: string; reason: string }>
}

/**
 * Parse CSV file and extract items
 */
async function parseCSV(filePath: string): Promise<{
    items: PurchaseItem[]
    stats: ImportStats
}> {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split(/\r?\n/).filter(line => line.trim())

    // Skip header row
    const dataLines = lines.slice(1)

    const items: PurchaseItem[] = []
    const stats: ImportStats = {
        totalItems: 0,
        totalValue: 0,
        itemsWithPrice: 0,
        itemsIgnored: 0,
        ignoredItems: []
    }

    for (const line of dataLines) {
        const [sku, requiredQty, currentStock, shortage, status, priority, priceStr] =
            line.split(',').map(s => s.trim())

        stats.totalItems++

        if (!sku || !priceStr) {
            console.warn(`⚠ Skipping invalid line (missing SKU or price): ${line}`)
            stats.itemsIgnored++
            stats.ignoredItems.push({
                sku: sku || 'UNKNOWN',
                reason: 'Missing SKU or price'
            })
            continue
        }

        const price = parseFloat(priceStr)

        // Ignore items with price 0
        if (price === 0) {
            console.log(`⊘ Ignoring SKU '${sku}' (price is 0)`)
            stats.itemsIgnored++
            stats.ignoredItems.push({
                sku,
                reason: 'Price is 0'
            })
            continue
        }

        // Use Required Quantity from CSV
        const quantity = parseInt(requiredQty, 10)

        if (isNaN(quantity) || quantity <= 0) {
            console.warn(`⚠ Skipping SKU '${sku}' (invalid quantity: ${requiredQty})`)
            stats.itemsIgnored++
            stats.ignoredItems.push({
                sku,
                reason: `Invalid quantity: ${requiredQty}`
            })
            continue
        }

        const item: PurchaseItem = {
            sku,
            quantity,
            price,
            is_part: true // All items from this CSV are parts
        }

        items.push(item)
        stats.itemsWithPrice++
        stats.totalValue += quantity * price
    }

    return { items, stats }
}

/**
 * Create a purchase order with items via REST API
 */
async function createPurchaseOrder(
    supplier: string,
    items: PurchaseItem[],
    tenantId: number,
    warehouseId: number,
    apiUrl: string,
    authToken?: string
): Promise<{ success: boolean; error?: string; purchaseId?: number }> {
    const today = new Date()
    const expectedDelivery = new Date(today)
    expectedDelivery.setDate(today.getDate() + 14) // 14 days from now

    const payload = {
        purchase: {
            supplier_name: supplier,
            supplier_order_no: `CSV_IMPORT_${Date.now()}`,
            expected_delivery_date: expectedDelivery.toISOString(),
            warehouse_id: warehouseId,
            remarks: 'Imported from CSV - parts with prices',
            customer_name: 'Stock Purchase'
        },
        items: items
    }

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        }

        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`
        }

        const response = await fetch(`${apiUrl}/api/v1/stock/purchases/with-items`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            return {
                success: false,
                error: `HTTP ${response.status}: ${errorText}`
            }
        }

        const result = await response.json()

        if (result.status === 201 && result.data) {
            return {
                success: true,
                purchaseId: result.data.purchase?.id
            }
        } else {
            return {
                success: false,
                error: result.message || 'Unknown error'
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }
    }
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2)

    if (args.length < 3) {
        console.error('Error: Missing required arguments')
        console.error('Usage: bun run src/scripts/create-purchase-from-csv.ts <csv-file-path> <warehouse-id> <tenant-id> [--supplier=<name>] [--api-url=<url>] [--dry-run] [--token=<token>]')
        process.exit(1)
    }

    const csvPath = path.resolve(process.cwd(), args[0])
    const warehouseId = parseInt(args[1], 10)
    const tenantId = parseInt(args[2], 10)

    // Parse optional flags
    let supplier = 'CSV Import Supplier'
    let apiUrl = 'https://api.circtek.io'
    let dryRun = false
    let authToken: string | undefined = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjUsInJvbGUiOiJ0ZXN0ZXIiLCJ0ZW5hbnRfaWQiOjIsIndhcmVob3VzZV9pZCI6MSwibWFuYWdlZF9zaG9wX2lkIjpudWxsLCJleHAiOjE3NjM2Mjc4NzEsImlhdCI6MTc2MTAzNTg3MX0.qnd3iCfsRTtCbkmiKGTYY8zznLNHlLpIe0FSLQInGF0'

    for (let i = 3; i < args.length; i++) {
        const arg = args[i]
        if (arg.startsWith('--supplier=')) {
            supplier = arg.split('=')[1]
        } else if (arg.startsWith('--api-url=')) {
            apiUrl = arg.split('=')[1]
        } else if (arg === '--dry-run') {
            dryRun = true
        } else if (arg.startsWith('--token=')) {
            authToken = arg.split('=')[1]
        }
    }

    if (isNaN(tenantId) || isNaN(warehouseId)) {
        console.error('Error: tenant-id and warehouse-id must be valid numbers')
        process.exit(1)
    }

    console.log(`\n${'='.repeat(70)}`)
    console.log(`${dryRun ? '[DRY RUN] ' : ''}Create Purchase Order from CSV`)
    console.log(`${'='.repeat(70)}`)
    console.log(`CSV File: ${csvPath}`)
    console.log(`Supplier: ${supplier}`)
    console.log(`Tenant ID: ${tenantId}`)
    console.log(`Warehouse ID: ${warehouseId}`)
    console.log(`API URL: ${apiUrl}`)
    console.log(`${dryRun ? 'Mode: DRY RUN (no API calls will be made)' : 'Mode: LIVE'}`)
    console.log(`${'='.repeat(70)}\n`)

    try {
        // Parse CSV
        console.log('📖 Parsing CSV file...')
        const { items, stats } = await parseCSV(csvPath)

        console.log(`\n${'─'.repeat(70)}`)
        console.log('CSV Parsing Results')
        console.log(`${'─'.repeat(70)}`)
        console.log(`Total items in CSV: ${stats.totalItems}`)
        console.log(`Items with valid price: ${stats.itemsWithPrice}`)
        console.log(`Items ignored: ${stats.itemsIgnored}`)

        if (stats.ignoredItems.length > 0) {
            console.log(`\nIgnored items details:`)
            stats.ignoredItems.forEach(item => {
                console.log(`  • ${item.sku}: ${item.reason}`)
            })
        }

        if (items.length === 0) {
            console.error('\n✗ No valid items to import (all items have price 0 or invalid data)')
            process.exit(1)
        }

        console.log(`\n${'─'.repeat(70)}`)
        console.log('Purchase Order Summary')
        console.log(`${'─'.repeat(70)}`)
        console.log(`Unique SKUs: ${items.length}`)
        console.log(`Total Quantity: ${items.reduce((sum, item) => sum + item.quantity, 0)}`)
        console.log(`Total Value: €${stats.totalValue.toFixed(2)}`)
        console.log(`\nItems to be included:`)

        items.forEach(item => {
            console.log(`  • ${item.sku}: ${item.quantity} × €${item.price.toFixed(2)} = €${(item.quantity * item.price).toFixed(2)}`)
        })

        if (dryRun) {
            console.log(`\n⊘ [DRY RUN] Skipping API call`)
            console.log(`\n✓ Script completed successfully (dry run)`)
        } else {
            console.log(`\n📤 Creating purchase order...`)
            const result = await createPurchaseOrder(
                supplier,
                items,
                tenantId,
                warehouseId,
                apiUrl,
                authToken
            )

            if (result.success) {
                console.log(`\n✓ Successfully created purchase order ${result.purchaseId ? `#${result.purchaseId}` : ''}`)
                console.log(`\n✓ Script completed successfully`)
            } else {
                console.error(`\n✗ Failed to create purchase order: ${result.error}`)
                process.exit(1)
            }
        }

        process.exit(0)
    } catch (error) {
        console.error('\n✗ Script failed:', error)
        process.exit(1)
    }
}

main()
