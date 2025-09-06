

import { eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { user_shop_access } from '../db/shops.schema';
import { warehouses } from '../db/circtek.schema';
/**
 * Returns list of shop IDs the user is allowed to access.
 * Admin & client roles => unrestricted (empty array means no restriction)
 */
export async function getAllowedShopIds(user_id: number, role: string, shop_id: number | undefined): Promise<number[] | undefined> {
  if (!user_id) return undefined;
  // Unrestricted roles
  if (role === 'admin' || role === 'super_admin') {
    return undefined;
  }
  // For shop managers, fetch explicit mappings
  if (role == 'shop_manager') {
    const rows = await db.select({shopId: user_shop_access.shop_id}).from(user_shop_access).where(eq(user_shop_access.user_id, user_id))
    return rows.map(r => r.shopId);
  }
 
  // Any other role – if managed_shop_id present, allow that
  if (shop_id) {
    return [shop_id];
  }
  return [];
}

/**
 * Returns list of warehouse IDs the user is allowed to access.
 * If undefined => no restriction.
 */
export async function getAllowedWarehouseIds(user_id: number, role: string, shop_id: string): Promise<number[] | undefined> {
//   if (!user) return undefined;
//   if (user.roleSlug === 'admin' || user.roleSlug === 'client') {
//     return undefined;
//   }
//   if (!user_id) return undefined;
//   if (role == 'admin' || role == 'super_admin') return undefined;
//   // Warehouse manager restricted to their warehoused
//   if (role_sl)
//   if (user.roleSlug === 'warehouse_manager' && user.warehouseId && user.warehouseId !== 0) {
//     return [user.warehouseId];
//   }
//   // Shop manager – derive via shop → warehouses mapping
//   if (user.roleSlug === 'shop_manager') {
//     const shopIds = await getAllowedShopIds(user);
//     if (!shopIds || shopIds.length === 0) return [];
//     const rows = await db.select({ id: warehouses.id })
//       .from(warehouses)
//       .where(inArray(warehouses.shopId, shopIds));
//     return rows.map(r => r.id);
//   }
  // Fallback
  return undefined;
} 