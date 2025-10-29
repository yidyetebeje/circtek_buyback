import 'dotenv/config';
import { db } from '../src/db/index';
import { purchase_items, purchases, stock, warehouses, tenants, sku_specs } from '../src/db/circtek.schema';
import { eq, sql } from 'drizzle-orm';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Script to compare remaining SKU quantities in purchases vs stock
 * 
 * This script:
 * 1. Calculates remaining quantity in purchases: quantity - quantity_used_for_repair
 * 2. Gets current stock quantity for each SKU
 * 3. Compares them and identifies discrepancies
 * 4. Generates a detailed CSV report
 * 
 * Usage: npx tsx scripts/compare-purchase-stock.ts
 */

interface ComparisonResult {
  sku: string;
  tenant_id: number;
  tenant_name: string;
  warehouse_id: number;
  warehouse_name: string;
  is_part: boolean;
  // Purchase data
  total_purchased: number;
  total_used_for_repair: number;
  remaining_in_purchases: number;
  purchase_count: number;
  // Stock data
  current_stock: number;
  // Comparison
  matches: boolean;
  difference: number;
  // Additional info
  sku_name: string;
}

function convertToCSV(results: ComparisonResult[]): string {
  if (results.length === 0) return '';

  // Define CSV headers
  const headers = [
    'SKU',
    'SKU Name',
    'Tenant',
    'Warehouse',
    'Type',
    'Total Purchased',
    'Used for Repair',
    'Remaining in Purchases',
    'Current Stock',
    'Matches',
    'Difference (Stock - Purchase)',
    'Purchase Records Count',
    'Status'
  ];

  // Create CSV rows
  const rows = results.map(result => {
    const status = result.matches ? '✓ Match' : 
                   result.difference > 0 ? '⚠ Stock Higher' : 
                   result.difference < 0 ? '⚠ Stock Lower' : 
                   'Unknown';
    
    return [
      result.sku || 'N/A',
      result.sku_name || 'N/A',
      result.tenant_name || 'N/A',
      result.warehouse_name || 'N/A',
      result.is_part ? 'Part' : 'Device',
      result.total_purchased,
      result.total_used_for_repair,
      result.remaining_in_purchases,
      result.current_stock,
      result.matches ? 'YES' : 'NO',
      result.difference,
      result.purchase_count,
      status
    ].map(field => {
      // Escape fields containing commas or quotes
      const fieldStr = String(field);
      if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
        return `"${fieldStr.replace(/"/g, '""')}"`;
      }
      return fieldStr;
    }).join(',');
  });

  // Combine headers and rows
  return [headers.join(','), ...rows].join('\n');
}

async function comparePurchaseStock() {
  try {
    console.log('🔍 Starting Purchase vs Stock Comparison Analysis...\n');
    console.log('═'.repeat(120));

    // Step 1: Get all purchase items aggregated by SKU, warehouse, and tenant
    console.log('\n📦 Step 1: Fetching purchase items data...');
    
    const purchaseData = await db
      .select({
        sku: purchase_items.sku,
        tenant_id: purchase_items.tenant_id,
        tenant_name: tenants.name,
        warehouse_id: purchases.warehouse_id,
        warehouse_name: warehouses.name,
        is_part: purchase_items.is_part,
        total_purchased: sql<number>`COALESCE(SUM(${purchase_items.quantity}), 0)`,
        total_used_for_repair: sql<number>`COALESCE(SUM(${purchase_items.quantity_used_for_repair}), 0)`,
        purchase_count: sql<number>`COUNT(${purchase_items.id})`,
      })
      .from(purchase_items)
      .leftJoin(purchases, eq(purchase_items.purchase_id, purchases.id))
      .leftJoin(tenants, eq(purchase_items.tenant_id, tenants.id))
      .leftJoin(warehouses, eq(purchases.warehouse_id, warehouses.id))
      .where(eq(purchase_items.status, true))
      .groupBy(
        purchase_items.sku,
        purchase_items.tenant_id,
        purchases.warehouse_id,
        tenants.name,
        warehouses.name,
        purchase_items.is_part
      );

    console.log(`✅ Found ${purchaseData.length} unique SKU-warehouse combinations in purchases`);

    // Step 2: Get all stock data
    console.log('\n📊 Step 2: Fetching stock data...');
    
    const stockData = await db
      .select({
        sku: stock.sku,
        tenant_id: stock.tenant_id,
        warehouse_id: stock.warehouse_id,
        is_part: stock.is_part,
        quantity: stock.quantity,
      })
      .from(stock)
      .where(eq(stock.status, true));

    console.log(`✅ Found ${stockData.length} stock records`);

    // Step 3: Get SKU names for better reporting
    console.log('\n📝 Step 3: Fetching SKU specifications...');
    
    const skuNames = await db
      .select({
        sku: sku_specs.sku,
        name: sql<string>`CONCAT_WS(' ', ${sku_specs.make}, ${sku_specs.model_name}, ${sku_specs.storage}, ${sku_specs.color})`,
        tenant_id: sku_specs.tenant_id,
      })
      .from(sku_specs)
      .where(eq(sku_specs.status, true));

    const skuNameMap = new Map<string, string>();
    skuNames.forEach(spec => {
      skuNameMap.set(`${spec.sku}-${spec.tenant_id}`, spec.name.trim());
    });

    console.log(`✅ Loaded ${skuNames.length} SKU specifications`);

    // Step 4: Create stock lookup map
    const stockMap = new Map<string, number>();
    stockData.forEach(item => {
      const key = `${item.sku}-${item.warehouse_id}-${item.tenant_id}`;
      stockMap.set(key, item.quantity);
    });

    // Step 5: Compare and build results
    console.log('\n🔄 Step 4: Comparing purchase and stock data...');
    
    const comparisonResults: ComparisonResult[] = [];
    
    // Process each purchase record
    for (const purchase of purchaseData) {
      if (!purchase.sku || !purchase.warehouse_id) {
        continue; // Skip records without SKU or warehouse
      }

      const key = `${purchase.sku}-${purchase.warehouse_id}-${purchase.tenant_id}`;
      const nameKey = `${purchase.sku}-${purchase.tenant_id}`;
      const currentStock = stockMap.get(key) || 0;
      
      const totalPurchased = Number(purchase.total_purchased);
      const totalUsed = Number(purchase.total_used_for_repair);
      const remaining = totalPurchased - totalUsed;
      
      const matches = currentStock === remaining;
      const difference = currentStock - remaining;

      comparisonResults.push({
        sku: purchase.sku,
        tenant_id: purchase.tenant_id,
        tenant_name: purchase.tenant_name || 'Unknown',
        warehouse_id: purchase.warehouse_id,
        warehouse_name: purchase.warehouse_name || 'Unknown',
        is_part: purchase.is_part || false,
        total_purchased: totalPurchased,
        total_used_for_repair: totalUsed,
        remaining_in_purchases: remaining,
        current_stock: currentStock,
        matches,
        difference,
        purchase_count: Number(purchase.purchase_count),
        sku_name: skuNameMap.get(nameKey) || 'Unknown',
      });
    }

    // Step 6: Check for stock records without corresponding purchases
    console.log('\n🔍 Step 5: Checking for stock without purchase records...');
    
    let stockOnlyCount = 0;
    for (const stockItem of stockData) {
      if (!stockItem.sku || !stockItem.warehouse_id) continue;

      const key = `${stockItem.sku}-${stockItem.warehouse_id}-${stockItem.tenant_id}`;
      const nameKey = `${stockItem.sku}-${stockItem.tenant_id}`;
      
      // Check if this SKU-warehouse combination exists in purchases
      const existsInPurchase = purchaseData.some(p => 
        p.sku === stockItem.sku && 
        p.warehouse_id === stockItem.warehouse_id &&
        p.tenant_id === stockItem.tenant_id
      );

      if (!existsInPurchase && stockItem.quantity > 0) {
        stockOnlyCount++;
        
        // Get tenant and warehouse names
        const tenant = await db
          .select({ name: tenants.name })
          .from(tenants)
          .where(eq(tenants.id, stockItem.tenant_id))
          .limit(1);
        
        const warehouse = await db
          .select({ name: warehouses.name })
          .from(warehouses)
          .where(eq(warehouses.id, stockItem.warehouse_id))
          .limit(1);

        comparisonResults.push({
          sku: stockItem.sku,
          tenant_id: stockItem.tenant_id,
          tenant_name: tenant[0]?.name || 'Unknown',
          warehouse_id: stockItem.warehouse_id,
          warehouse_name: warehouse[0]?.name || 'Unknown',
          is_part: stockItem.is_part || false,
          total_purchased: 0,
          total_used_for_repair: 0,
          remaining_in_purchases: 0,
          current_stock: stockItem.quantity,
          matches: false,
          difference: stockItem.quantity,
          purchase_count: 0,
          sku_name: skuNameMap.get(nameKey) || 'Unknown',
        });
      }
    }

    console.log(`✅ Found ${stockOnlyCount} stock records without purchase history`);

    // Step 7: Sort results (mismatches first, then by difference)
    comparisonResults.sort((a, b) => {
      if (a.matches && !b.matches) return 1;
      if (!a.matches && b.matches) return -1;
      return Math.abs(b.difference) - Math.abs(a.difference);
    });

    // Step 8: Display summary
    console.log('\n' + '═'.repeat(120));
    console.log('\n📊 COMPARISON SUMMARY:\n');
    
    const totalRecords = comparisonResults.length;
    const matchingRecords = comparisonResults.filter(r => r.matches).length;
    const mismatchRecords = totalRecords - matchingRecords;
    const stockHigher = comparisonResults.filter(r => r.difference > 0).length;
    const stockLower = comparisonResults.filter(r => r.difference < 0).length;
    const totalDifference = comparisonResults.reduce((sum, r) => sum + Math.abs(r.difference), 0);

    console.log(`  Total SKU-Warehouse Combinations:    ${totalRecords}`);
    console.log(`  ✅ Matching Records:                  ${matchingRecords} (${((matchingRecords/totalRecords)*100).toFixed(1)}%)`);
    console.log(`  ❌ Mismatching Records:               ${mismatchRecords} (${((mismatchRecords/totalRecords)*100).toFixed(1)}%)`);
    console.log(`     ↗ Stock Higher than Purchase:     ${stockHigher}`);
    console.log(`     ↘ Stock Lower than Purchase:      ${stockLower}`);
    console.log(`  📊 Total Absolute Difference:         ${totalDifference} units`);

    // Display top mismatches
    if (mismatchRecords > 0) {
      console.log('\n🚨 TOP 10 DISCREPANCIES:\n');
      console.log('─'.repeat(120));
      
      const topMismatches = comparisonResults
        .filter(r => !r.matches)
        .slice(0, 10);

      topMismatches.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.sku} - ${result.sku_name}`);
        console.log(`   Tenant: ${result.tenant_name}, Warehouse: ${result.warehouse_name}`);
        console.log(`   Type: ${result.is_part ? '🔧 Part' : '📱 Device'}`);
        console.log(`   Purchase: ${result.total_purchased} total, ${result.total_used_for_repair} used, ${result.remaining_in_purchases} remaining`);
        console.log(`   Stock: ${result.current_stock} units`);
        console.log(`   Difference: ${result.difference > 0 ? '+' : ''}${result.difference} ${result.difference > 0 ? '(Stock has MORE)' : '(Stock has LESS)'}`);
      });
    }

    console.log('\n' + '═'.repeat(120));

    // Step 9: Export to CSV
    console.log('\n📄 Generating CSV report...');
    
    const csvContent = convertToCSV(comparisonResults);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19);
    const filename = `purchase-stock-comparison-${timestamp}.csv`;
    const filepath = join(process.cwd(), 'exports', filename);
    
    // Create exports directory if it doesn't exist
    const exportsDir = join(process.cwd(), 'exports');
    try {
      const { mkdirSync } = await import('fs');
      mkdirSync(exportsDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, that's fine
    }
    
    writeFileSync(filepath, csvContent, 'utf8');
    console.log(`✅ CSV file saved to: ${filepath}`);
    console.log(`📊 Total records exported: ${comparisonResults.length}`);

    // Display file location clearly
    console.log('\n' + '═'.repeat(120));
    console.log(`\n🎉 Analysis Complete! Report saved to:\n   ${filepath}\n`);
    console.log('═'.repeat(120) + '\n');

  } catch (error) {
    console.error('\n❌ Error during comparison:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the script
comparePurchaseStock();
