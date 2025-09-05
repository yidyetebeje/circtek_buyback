import { eq, and, or, sql, InferSelectModel } from "drizzle-orm";
import { db } from "../../db";

import { user_shop_access, shops } from "../../db/shops.schema";
import { users } from "../../db/circtek.schema";

export type UserShopAccessCreate = {
  userId: number;
  shopId: number;
  canView?: boolean;
  canEdit?: boolean;
  createdBy?: number;
};

export type UserShopAccessUpdate = {
  canView?: boolean;
  canEdit?: boolean;
};

export class UserShopAccessRepository {
  async findByUserId(userId: number) {
    return db.select({
      id: user_shop_access.id,
      user_id: user_shop_access.user_id,
      shop_id: user_shop_access.shop_id,
      shopName: shops.name,
      can_view: user_shop_access.can_view,
      can_edit: user_shop_access.can_edit,
      created_at: user_shop_access.created_at,
      updated_at: user_shop_access.updated_at,
    })
    .from(user_shop_access)
    .leftJoin(shops, eq(user_shop_access.shop_id, shops.id))
    .where(eq(user_shop_access.user_id, userId));
  }

  async findByShopId(shopId: number) {
    return db.select({
      id: user_shop_access.id,
      user_id: user_shop_access.user_id,
      user_name: users.user_name,
      user_email: users.email,
      user_full_name: users.name,
      shop_id: user_shop_access.shop_id,
      can_view: user_shop_access.can_view,
      can_edit: user_shop_access.can_edit,
      created_at: user_shop_access.created_at,
      updated_at: user_shop_access.updated_at,
    })
    .from(user_shop_access)
    .leftJoin(users, eq(user_shop_access.user_id, users.id))
    .where(eq(user_shop_access.shop_id, shopId));
  }

  async findByUserAndShopId(userId: number, shopId: number) {
    const result = await db.select()
      .from(user_shop_access)
      .where(
        and(
          eq(user_shop_access.user_id, userId),
          eq(user_shop_access.shop_id, shopId)
        )
      )
      .limit(1);
    
    return result[0];
  }

  async create(data: UserShopAccessCreate) {
    const result = await db.insert(user_shop_access).values({
      user_id: data.userId,
      shop_id: data.shopId,
      can_view: data.canView ?? true,
      can_edit: data.canEdit ?? false,
      created_by: data.createdBy
    });
    
    const insertId = Number(result[0]?.insertId);
    if (insertId) {
      return this.findByUserAndShopId(data.userId, data.shopId);
    }
    return null;
  }

  async update(userId: number, shopId: number, data: UserShopAccessUpdate) {
    const new_data = {
      can_view: data.canView,
      can_edit: data.canEdit,
    }
    await db.update(user_shop_access)
      .set(new_data)
      .where(
        and(
          eq(user_shop_access.user_id, userId),
          eq(user_shop_access.shop_id, shopId)
        )
      );
    
    return this.findByUserAndShopId(userId, shopId);
  }

  async delete(userId: number, shopId: number) {
    const result = await db.delete(user_shop_access)
      .where(
        and(
          eq(user_shop_access.user_id, userId),
          eq(user_shop_access.shop_id, shopId)
        )
      );
    
    return (result as any).affectedRows > 0;
  }

  async checkUserHasAccessToShop(userId: number, shopId: number, requiresEdit: boolean = false) {
    // First get the user to check if they are a shop manager with this as their managed shop
    const userResult = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    if (userResult.length > 0 && userResult[0].managed_shop_id === shopId) {
      return true; // User is the manager of this shop
    }
      
    // Next check direct shop ownership or client association
    const shopResult = await db.select({
      shop: shops,
      user: users
    })
    .from(shops)
    .innerJoin(users, eq(users.id, userId))
    .where(eq(shops.id, shopId))
    .limit(1);
    
    if (shopResult.length > 0) {
      const { shop, user } = shopResult[0];
      if (user.tenant_id === shop.tenant_id) {
        return true;
      }
    }

    // If not an owner/client/manager user, check explicit access grants
    const accessResult = await db.select()
      .from(user_shop_access)
      .where(
        and(
          eq(user_shop_access.user_id, userId),
          eq(user_shop_access.shop_id, shopId),
          requiresEdit ? eq(user_shop_access.can_edit, true) : eq(user_shop_access.can_view, true)
        )
      )
      .limit(1);
    
    return accessResult.length > 0;
  }

  async getAccessibleShopIds(userId: number, requiresEdit: boolean = false) {
    // First get the user's info to check client association and managed shop
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userResult.length === 0) {
      return [];
    }
    
    const user = userResult[0];
    
    // Get shop IDs based on explicit access grants
    const accessGrants = await db.select({ shopId: user_shop_access.shop_id })
      .from(user_shop_access)
      .where(
        and(
          eq(user_shop_access.user_id, userId),
          requiresEdit ? eq(user_shop_access.can_edit, true) : eq(user_shop_access.can_view, true)
        )
      );
    
    const explicitShopIds = accessGrants.map(grant => grant.shopId);
    
    // Collection of shop IDs the user has access to
    const allAccessibleShopIds = [...explicitShopIds];
    
    // If user has a managed shop, include it (shop managers always have full access to their managed shops)
    if (user.managed_shop_id) {
      allAccessibleShopIds.push(user.managed_shop_id);
    }
    
    // If user is associated with a client, also get shops for that client
    if (user.tenant_id) {
      const clientShops = await db.select({ id: shops.id })
        .from(shops)
        .where(eq(shops.tenant_id, user.tenant_id));
      
      const implicitShopIds = clientShops.map(shop => shop.id);
      allAccessibleShopIds.push(...implicitShopIds);
    }
    
    // Get shops where the user is the owner
    const ownedShops = await db.select({ id: shops.id })
      .from(shops)
      .where(eq(shops.owner_id, user.id));
    
    const ownedShopIds = ownedShops.map(shop => shop.id);
    allAccessibleShopIds.push(...ownedShopIds);
    
    // Remove duplicates and return
    return [...new Set(allAccessibleShopIds)];
  }
}

export const userShopAccessRepository = new UserShopAccessRepository(); 