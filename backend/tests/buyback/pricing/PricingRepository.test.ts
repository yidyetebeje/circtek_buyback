import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { PricingRepository } from "../../../src/buyback/pricing/PricingRepository";
import { db } from "../../../src/db";
import { devices, purchase_items, received_items, purchases, tenants, warehouses, users, roles } from "../../../src/db/circtek.schema";
import { shops } from "../../../src/db/shops.schema";
import { sql } from "drizzle-orm";

// Helper to create dependencies
async function setupDependencies() {
  // Create Tenant
  const [tenantResult] = await db.insert(tenants).values({
    name: "Test Tenant",
    description: "Test",
    status: true
  });
  const tenantId = tenantResult.insertId;

  // Create Shop
  const [shopResult] = await db.insert(shops).values({
    name: "Test Shop",
    tenant_id: tenantId,
    owner_id: tenantId // References the super_admin user or tenant depending on schema. Schema says tenant.
  });
  const shopId = shopResult.insertId;

  // Create Warehouse
  const [warehouseResult] = await db.insert(warehouses).values({
    name: "Test Warehouse",
    description: "Test",
    tenant_id: tenantId,
    shop_id: shopId
  });
  const warehouseId = warehouseResult.insertId;

  return { tenantId, warehouseId };
}

describe("PricingRepository Integration", () => {
  let repo: PricingRepository;
  let tenantId: number;
  let warehouseId: number;

  beforeEach(async () => {
    repo = new PricingRepository();
    // Clean up tables we use
    await db.delete(received_items);
    await db.delete(purchase_items);
    await db.delete(purchases);
    await db.delete(devices);
    await db.delete(warehouses);
    await db.delete(users);
    await db.delete(shops);
    await db.delete(tenants);

    // We might need to setup tenant/warehouse if they don't exist, 
    // but cleaning them up might break other things. 
    // Let's assume we can insert new ones.
    const deps = await setupDependencies();
    tenantId = deps.tenantId;
    warehouseId = deps.warehouseId;
  });

  afterEach(async () => {
    // Cleanup
    await db.delete(received_items);
    await db.delete(purchase_items);
    await db.delete(purchases);
    await db.delete(devices);
    // Optional: cleanup tenant/warehouse
  });

  test("should calculate weighted average acquisition cost correctly", async () => {
    const sku = "TEST-SKU-123";

    // 1. Create Purchase
    const [purchaseResult] = await db.insert(purchases).values({
      purchase_order_no: "PO-001",
      supplier_name: "Supplier A",
      supplier_order_no: "SO-001",
      expected_delivery_date: new Date("2023-01-01"),
      warehouse_id: warehouseId,
      tenant_id: tenantId
    });
    const purchaseId = purchaseResult.insertId;

    // 2. Create Purchase Items (Batch 1: Expensive)
    const [pi1] = await db.insert(purchase_items).values({
      purchase_id: purchaseId,
      sku: sku,
      quantity: 10,
      price: "200.00", // Cost 200
      tenant_id: tenantId
    });

    // 3. Create Purchase Items (Batch 2: Cheap)
    const [pi2] = await db.insert(purchase_items).values({
      purchase_id: purchaseId,
      sku: sku,
      quantity: 10,
      price: "100.00", // Cost 100
      tenant_id: tenantId
    });

    // 4. Create Devices and Receive them
    // Receive 1 device from Batch 1 (Cost 200)
    const [d1] = await db.insert(devices).values({
      sku: sku,
      tenant_id: tenantId,
      warehouse_id: warehouseId,
      status: true
    });
    await db.insert(received_items).values({
      purchase_id: purchaseId,
      purchase_item_id: pi1.insertId,
      sku: sku,
      device_id: d1.insertId,
      quantity: 1,
      tenant_id: tenantId
    });

    // Receive 1 device from Batch 2 (Cost 100)
    const [d2] = await db.insert(devices).values({
      sku: sku,
      tenant_id: tenantId,
      warehouse_id: warehouseId,
      status: true
    });
    await db.insert(received_items).values({
      purchase_id: purchaseId,
      purchase_item_id: pi2.insertId,
      sku: sku,
      device_id: d2.insertId,
      quantity: 1,
      tenant_id: tenantId
    });

    // Average should be (200 + 100) / 2 = 150
    const avgCost = await repo.getAverageAcquisitionCost(sku);
    expect(avgCost).toBe(150);
  });

  test("should return 0 if no stock exists", async () => {
    const cost = await repo.getAverageAcquisitionCost("NON-EXISTENT-SKU");
    expect(cost).toBe(0);
  });
});
