import { db } from "../../db";
import { and, eq } from "drizzle-orm";
import { shops } from "../../db/shops.schema";
import { user_shop_access } from "../../db/shops.schema";
import {users } from '../../db/circtek.schema'
import { tenant_routes } from "../../tenants";

/**
 * Service for managing shop access permissions
 */
export class ShopAccessService {
  /**
   * Get all shop IDs that a user has access to
   * @param userId The ID of the user
   * @returns Array of shop IDs the user can access
   */
  async getAccessibleShopIds(tenant_id: number, user_id: number): Promise<number[]> {
    const userInfo = await db.select()
      .from(users)
      .where(eq(users.id, user_id))
      .limit(1);

    const result = await db
      .selectDistinct({ shopId: user_shop_access.shop_id })
      .from(user_shop_access)
      .where(and(eq(user_shop_access.user_id, user_id), eq(user_shop_access.can_view, true)));
  
    const owned_shops = await db
      .selectDistinct({ shopId: shops.id })
      .from(shops)
      .where(eq(shops.owner_id, user_id));
    
    const clients_shops = await db
      .selectDistinct({ shopId: shops.id })
      .from(shops)
      .where(eq(shops.tenant_id, tenant_id));
    
    const managed_shops: {shopId: number}[] = [];
    if (userInfo.length > 0 && userInfo[0].managed_shop_id) {
      managed_shops.push({ shopId: userInfo[0].managed_shop_id });
    }
    const all_shops = [...result, ...owned_shops, ...clients_shops, ...managed_shops];
    const unique_shops = Array.from(new Set(all_shops.map(r => r.shopId)));
    
    return unique_shops;
  }

  /**
   * Check if a user has access to a specific shop
   * @param userId The ID of the user
   * @param shopId The ID of the shop
   * @returns Boolean indicating whether the user has access
   */
  async hasShopAccess(userId: number, shopId: number, tenant_id: number): Promise<boolean> {
    const accessibleShopIds = await this.getAccessibleShopIds(tenant_id, userId);
    return accessibleShopIds.includes(shopId);
  }
  
  /**
   * Grants shop access to a user by adding an entry to the user_shop_access table
   * @param userId The ID of the user
   * @param shopId The ID of the shop
   * @param canView Whether the user can view the shop (default: true)
   * @param canEdit Whether the user can edit the shop (default: false)
   * @returns True if access was successfully granted
   */
  async addShopAccess(
    userId: number, 
    shopId: number, 
    canView: boolean = true, 
    canEdit: boolean = false
  ): Promise<boolean> {
    try {
      // Check if access already exists
      const existingAccess = await db
        .select()
        .from(user_shop_access)
        .where(and(
          eq(user_shop_access.user_id, userId),
          eq(user_shop_access.shop_id, shopId)
        ))
        .limit(1);
      
      if (existingAccess.length > 0) {
        // Update existing access if permissions differ
        if (existingAccess[0].can_view !== canView || existingAccess[0].can_edit !== canEdit) {
          await db
            .update(user_shop_access)
            .set({ can_view: canView, can_edit: canEdit })
            .where(and(
              eq(user_shop_access.user_id, userId),
              eq(user_shop_access.shop_id, shopId)
            ));
        }
      } else {
        // Create new access entry
        await db.insert(user_shop_access).values({
          user_id: userId,
          shop_id: shopId,
          can_view: canView,
          can_edit: canEdit,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error adding shop access:', error);
      return false;
    }
  }
}

export const shopAccessService = new ShopAccessService(); 