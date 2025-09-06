import { db } from "../../db";
import { and, eq } from "drizzle-orm";
import { shops, userShopAccess } from "../../db/schema/userAccess";
import { users } from "../../db/schema/user";

/**
 * Service for managing shop access permissions
 */
export class ShopAccessService {
  /**
   * Get all shop IDs that a user has access to
   * @param userId The ID of the user
   * @returns Array of shop IDs the user can access
   */
  async getAccessibleShopIds(userId: number): Promise<number[]> {
    const userInfo = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const result = await db
      .selectDistinct({ shopId: userShopAccess.shopId })
      .from(userShopAccess)
      .where(and(eq(userShopAccess.userId, userId), eq(userShopAccess.canView, true)));
  
    const owned_shops = await db
      .selectDistinct({ shopId: shops.id })
      .from(shops)
      .where(eq(shops.owner_id, userId));
    
    const clients_shops = await db
      .selectDistinct({ shopId: shops.id })
      .from(shops)
      .where(eq(shops.client_id, userId));
    
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
  async hasShopAccess(userId: number, shopId: number): Promise<boolean> {
    const accessibleShopIds = await this.getAccessibleShopIds(userId);
    return accessibleShopIds.includes(shopId);
  }
  
  /**
   * Grants shop access to a user by adding an entry to the userShopAccess table
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
        .from(userShopAccess)
        .where(and(
          eq(userShopAccess.userId, userId),
          eq(userShopAccess.shopId, shopId)
        ))
        .limit(1);
      
      if (existingAccess.length > 0) {
        // Update existing access if permissions differ
        if (existingAccess[0].canView !== canView || existingAccess[0].canEdit !== canEdit) {
          await db
            .update(userShopAccess)
            .set({ canView, canEdit })
            .where(and(
              eq(userShopAccess.userId, userId),
              eq(userShopAccess.shopId, shopId)
            ));
        }
      } else {
        // Create new access entry
        await db.insert(userShopAccess).values({
          userId,
          shopId,
          canView,
          canEdit,
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
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