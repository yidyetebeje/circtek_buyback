import { userShopAccessService } from "../services/userShopAccessService";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";
import { UserShopAccessCreate, UserShopAccessUpdate } from "../repositories/userShopAccessRepository";
import { AuthContext } from "../types/authTypes";

export class UserShopAccessController {
  async getUserShops(userId: number, ctx: AuthContext) {
    try {
      if (!userId || isNaN(userId)) {
        ctx.set.status = 400;
        return { error: 'Invalid user ID' };
      }
      
      // Extract requesting user ID from JWT token
      const requestingUser = ctx.user?.id;
      if (!requestingUser) {
        ctx.set.status = 401;
        return { error: 'Authentication required' };
      }
      
      const shopAccess = await userShopAccessService.getUserShopAccess(userId);
      return {
        data: shopAccess
      };
    } catch (error: any) {
      console.error(`Error in getUserShops: ${error.message}`);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve user shop access' };
    }
  }

  async getShopUsers(shopId: number, ctx: AuthContext) {
    try {
      const {currentTenantId, currentUserId} = ctx as any;
      if (!shopId || isNaN(shopId)) {
        ctx.set.status = 400;
        return { error: 'Invalid shop ID' };
      }
      
      // Extract requesting user ID from JWT token
      const requestingUserId = currentUserId;
    
      if (!requestingUserId) {
        ctx.set.status = 401;
        return { error: 'Authentication required' };
      }
      
      // Check if the requesting user has access to this shop
      const hasAccess = await userShopAccessService.checkUserHasAccessToShop(requestingUserId, shopId);
      if (!hasAccess) {
        ctx.set.status = 403;
        return { error: 'You do not have permission to view users for this shop' };
      }
      
      const shopUsers = await userShopAccessService.getShopUsers(shopId);
      return {
        data: shopUsers
      };
    } catch (error: any) {
      console.error(`Error in getShopUsers: ${error.message}`);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve shop users' };
    }
  }

  async grantAccess(data: UserShopAccessCreate, ctx: AuthContext) {
    try {
      const {currentTenantId, currentUserId} = ctx as any;
      // Extract requesting user ID from JWT token
      console.log('grant access', ctx.user);
      const requestingUserId = currentUserId;
      console.log('requestingUserId', requestingUserId);
      if (!requestingUserId) {
        ctx.set.status = 401;
        return { error: 'Authentication required' };
      }
      
      const result = await userShopAccessService.grantShopAccess(data, requestingUserId);
      ctx.set.status = 201;
      return {
        data: result,
        message: 'Shop access granted successfully'
      };
    } catch (error: any) {
      console.error(`Error in grantAccess: ${error.message}`);
      
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      
      if (error instanceof ForbiddenError) {
        ctx.set.status = 403;
        return { error: error.message };
      }
      
      ctx.set.status = 500;
      return { error: 'Failed to grant shop access' };
    }
  }

  async updateAccess(userId: number, shopId: number, data: UserShopAccessUpdate, ctx: AuthContext) {
    try {
      // Extract requesting user ID from JWT token
      const {currentTenantId, currentUserId} = ctx as any;
      const requestingUserId = currentUserId;
      if (!requestingUserId) {
        ctx.set.status = 401;
        return { error: 'Authentication required' };
      }
      
      const result = await userShopAccessService.updateShopAccess(userId, shopId, data, requestingUserId);
      return {
        data: result,
        message: 'Shop access updated successfully'
      };
    } catch (error: any) {
      console.error(`Error in updateAccess: ${error.message}`);
      
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      
      if (error instanceof ForbiddenError) {
        ctx.set.status = 403;
        return { error: error.message };
      }
      
      ctx.set.status = 500;
      return { error: 'Failed to update shop access' };
    }
  }

  async revokeAccess(userId: number, shopId: number, ctx: AuthContext) {
    try {
      // Extract requesting user ID from JWT token
      const {currentTenantId, currentUserId} = ctx as any;
      const requestingUserId = currentUserId;
      if (!requestingUserId) {
        ctx.set.status = 401;
        return { error: 'Authentication required' };
      }
      
      const result = await userShopAccessService.revokeShopAccess(userId, shopId, requestingUserId);
      return {
        data: result,
        message: 'Shop access revoked successfully'
      };
    } catch (error: any) {
      console.error(`Error in revokeAccess: ${error.message}`);
      
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      
      if (error instanceof ForbiddenError) {
        ctx.set.status = 403;
        return { error: error.message };
      }
      
      ctx.set.status = 500;
      return { error: 'Failed to revoke shop access' };
    }
  }

  // Utility method for other controllers to check access
  async checkAccess(userId: number, shopId: number, requiresEdit: boolean = false) {
    return userShopAccessService.checkUserHasAccessToShop(userId, shopId, requiresEdit);
  }
}

export const userShopAccessController = new UserShopAccessController(); 