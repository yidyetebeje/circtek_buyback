import 'dotenv/config';
import { db } from '../src/db/index';
import { purchase_items, purchases, tenants } from '../src/db/circtek.schema';
import { eq } from 'drizzle-orm';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Script to list all purchase_items in the database and export to CSV
 * Usage: npx tsx scripts/list-purchase-items.ts
 */

function convertToCSV(items: any[]): string {
  if (items.length === 0) return '';

  // Define CSV headers
  const headers = [
    'ID',
    'Purchase Order No',
    'Purchase ID',
    'Supplier Name',
    'Tenant Name',
    'Tenant ID',
    'SKU',
    'Type',
    'Quantity Ordered',
    'Quantity Used',
    'Quantity Available',
    'Unit Price',
    'Total Value',
    'Status',
    'Created At'
  ];

  // Create CSV rows
  const rows = items.map(item => {
    const availableQuantity = item.quantity - (item.quantity_used_for_repair || 0);
    const totalValue = Number(item.price) * item.quantity;
    
    return [
      item.id,
      item.purchase_order_no || 'N/A',
      item.purchase_id,
      item.supplier_name || 'N/A',
      item.tenant_name || 'N/A',
      item.tenant_id,
      item.sku || 'N/A',
      item.is_part ? 'Part' : 'Device',
      item.quantity,
      item.quantity_used_for_repair || 0,
      availableQuantity,
      Number(item.price).toFixed(2),
      totalValue.toFixed(2),
      item.status ? 'Active' : 'Inactive',
      item.created_at ? new Date(item.created_at).toISOString() : 'N/A'
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

async function listPurchaseItems() {
  try {
    console.log('📦 Fetching all purchase items from database...\n');

    // Get all purchase items with related purchase and tenant information
    const items = await db
      .select({
        // Purchase item fields
        id: purchase_items.id,
        purchase_id: purchase_items.purchase_id,
        sku: purchase_items.sku,
        quantity: purchase_items.quantity,
        quantity_used_for_repair: purchase_items.quantity_used_for_repair,
        price: purchase_items.price,
        is_part: purchase_items.is_part,
        status: purchase_items.status,
        tenant_id: purchase_items.tenant_id,
        created_at: purchase_items.created_at,
        // Purchase fields
        purchase_order_no: purchases.purchase_order_no,
        supplier_name: purchases.supplier_name,
        // Tenant fields
        tenant_name: tenants.name,
      })
      .from(purchase_items)
      .leftJoin(purchases, eq(purchase_items.purchase_id, purchases.id))
      .leftJoin(tenants, eq(purchase_items.tenant_id, tenants.id))
      .orderBy(purchase_items.created_at);

    if (items.length === 0) {
      console.log('❌ No purchase items found in the database.');
      return;
    }

    console.log(`✅ Found ${items.length} purchase items:\n`);
    console.log('═'.repeat(120));

    // Display items in a formatted table
    items.forEach((item, index) => {
      const availableQuantity = item.quantity - (item.quantity_used_for_repair || 0);
      
      console.log(`\n📋 Item #${index + 1}`);
      console.log('─'.repeat(120));
      console.log(`  ID:                    ${item.id}`);
      console.log(`  Purchase Order:        ${item.purchase_order_no || 'N/A'} (ID: ${item.purchase_id})`);
      console.log(`  Supplier:              ${item.supplier_name || 'N/A'}`);
      console.log(`  Tenant:                ${item.tenant_name || 'N/A'} (ID: ${item.tenant_id})`);
      console.log(`  SKU:                   ${item.sku || 'N/A'}`);
      console.log(`  Type:                  ${item.is_part ? '🔧 Part' : '📱 Device'}`);
      console.log(`  Quantity Ordered:      ${item.quantity}`);
      console.log(`  Quantity Used:         ${item.quantity_used_for_repair || 0}`);
      console.log(`  Quantity Available:    ${availableQuantity} ${availableQuantity === 0 ? '(⚠️  Fully allocated)' : ''}`);
      console.log(`  Unit Price:            $${Number(item.price).toFixed(2)}`);
      console.log(`  Total Value:           $${(Number(item.price) * item.quantity).toFixed(2)}`);
      console.log(`  Status:                ${item.status ? '✅ Active' : '❌ Inactive'}`);
      console.log(`  Created At:            ${item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}`);
    });

    console.log('\n' + '═'.repeat(120));
    
    // Summary statistics
    const totalItems = items.length;
    const activeParts = items.filter(i => i.is_part && i.status).length;
    const activeDevices = items.filter(i => !i.is_part && i.status).length;
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalUsed = items.reduce((sum, i) => sum + (i.quantity_used_for_repair || 0), 0);
    const totalValue = items.reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0);
    
    console.log('\n📊 Summary Statistics:');
    console.log('─'.repeat(120));
    console.log(`  Total Purchase Items:      ${totalItems}`);
    console.log(`  Active Parts:              ${activeParts}`);
    console.log(`  Active Devices:            ${activeDevices}`);
    console.log(`  Total Quantity Ordered:    ${totalQuantity}`);
    console.log(`  Total Quantity Used:       ${totalUsed}`);
    console.log(`  Total Quantity Available:  ${totalQuantity - totalUsed}`);
    console.log(`  Total Inventory Value:     $${totalValue.toFixed(2)}`);
    console.log('═'.repeat(120) + '\n');

    // Export to CSV
    const csvContent = convertToCSV(items);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `purchase-items-${timestamp}.csv`;
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
    console.log(`📄 CSV file saved to: ${filepath}`);
    console.log(`📊 Total records exported: ${items.length}\n`);

  } catch (error) {
    console.error('❌ Error fetching purchase items:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the script
listPurchaseItems();
