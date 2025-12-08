import { Context } from "elysia";
import { shopService } from "../services/shopService";
import { TShopCreate, TShopUpdate, TShopConfigUpdate } from "../types/shopTypes"; 
import { NotFoundError, BadRequestError, ForbiddenError } from "../utils/errors";
import { userShopAccessController } from "./userShopAccessController";
import { AuthContext } from "../types/authTypes";
import { defaultShopConfig } from "./default_config";

export class ShopController {
  async getAll(ctx: AuthContext) {
    try {
      const page = ctx.query.page ? parseInt(ctx.query.page as string, 10) : 1;
      const limit = ctx.query.limit ? parseInt(ctx.query.limit as string, 10) : 20;
      const orderBy = ctx.query.orderBy as string || 'name';
      const order = (ctx.query.order as string) === 'desc' ? 'desc' : 'asc';
      const tenant_id = ctx.query.tenant_id ? parseInt(ctx.query.tenant_id as string, 10) : undefined; 
      const ownerId = ctx.query.ownerId ? parseInt(ctx.query.ownerId as string, 10) : undefined;
      const active = (ctx.query.active !== null && ctx.query.active !== undefined) ? Boolean(ctx.query.active) : undefined;
      const search = ctx.query.search as string || undefined;
      const {currentUserId} = ctx as any;
      const userId = currentUserId;

      if (isNaN(page) || page < 1) throw new BadRequestError('Invalid page number.');
      if (isNaN(limit) || limit < 1) throw new BadRequestError('Invalid limit value.');
      if (tenant_id !== undefined && isNaN(tenant_id)) throw new BadRequestError('Invalid tenant ID.');
      if (ownerId !== undefined && isNaN(ownerId)) throw new BadRequestError('Invalid owner ID.');

      // Shop manager can only see their managed shop
      if (ctx.user?.roleSlug === 'shop_manager' && ctx.user?.managed_shop_id) {
        // For shop_manager, we only return the shop they manage
        const managedShop = await shopService.getShopById(ctx.user.managed_shop_id);
        if (!managedShop) {
          return {
            data: [],
            meta: {
              total: 0,
              page: page,
              limit: limit,
              totalPages: 0
            }
          };
        }
        return {
          data: [managedShop],
          meta: {
            total: 1,
            page: 1,
            limit: 1,
            totalPages: 1
          }
        };
      }
      // If user is authenticated, filter by shops they have access to
      else if (userId) {
        const result = await shopService.getAllShops(page, limit, orderBy, order, tenant_id, ownerId, userId, active, search);
        return result;
      } else {
        // If no user ID, proceed with normal query (admin/public route)
        const result = await shopService.getAllShops(page, limit, orderBy, order, tenant_id, ownerId, undefined, active, search);
        return result;
      }
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        ctx.set.status = 400;
        return { error: error.message };
      }
      console.error("Error in ShopController.getAll:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve shops' };
    }
  }

  async getById(id: number, ctx: Context) {
    try {
      console.log("send request", id)
      const shop = await shopService.getShopById(id);
      if (!shop) {
        ctx.set.status = 404;
        return { error: `Shop with ID ${id} not found` };
      }
      return {
        data: shop,
      }
    } catch (error: any) {
      console.log("error", error)
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
      console.error("Error in ShopController.getById:", error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve shop' };
    }
  }

  async create(data: TShopCreate, ctx: AuthContext) { 
    try {
      let { currentUserId, currentTenantId, currentWarehouseId } = ctx as any;
      // Enhanced validation with specific error messages
      if (!data.name?.trim()) {
        throw new BadRequestError('Shop name is required and cannot be empty or contain only whitespace.');
      }

      

      // Validate required organization field
      if (!data.organization || typeof data.organization !== 'string') {
        throw new BadRequestError('Organization name is required and must be a valid string.');
      }
      if (data.organization.trim() === '') {
        throw new BadRequestError('Organization name cannot be empty or contain only whitespace.');
      }

      // Validate required phone field
      if (!data.phone || typeof data.phone !== 'string') {
        throw new BadRequestError('Phone number is required and must be a valid string.');
      }
      if (data.phone.trim() === '') {
        throw new BadRequestError('Phone number cannot be empty or contain only whitespace.');
      } else {
        // Basic phone validation
        const phoneRegex = /^[+]?[\s\-\(\)]*([0-9][\s\-\(\)]*){10,}$/;
        if (!phoneRegex.test(data.phone.trim())) {
          throw new BadRequestError('Phone number must contain at least 10 digits and be in a valid format.');
        }
      }

      // Validate optional logo field
      if (data.logo !== null && data.logo !== undefined) {
        if (typeof data.logo !== 'string') {
          throw new BadRequestError('Logo must be a valid string if provided.');
        }
        if (data.logo.trim() === '') {
          data.logo = null; // Convert empty string to null
        }
      }

      if (data.active !== null && data.active !== undefined && typeof data.active !== 'boolean') {
        throw new BadRequestError('Active status must be a boolean value (true or false).');
      }

      // Shop managers cannot create shops
      if (ctx.user?.roleSlug === 'shop_manager') {
        throw new ForbiddenError('Shop Managers cannot create new shops.');
      }
      data.owner_id = currentTenantId;
      data.tenant_id = currentTenantId;
      data.config = defaultShopConfig;
    
     

      const newShop = await shopService.createShop(data);
      
      // If created by a user, automatically grant them access
      if (currentUserId && newShop.id) {
        try {
          await userShopAccessController.grantAccess({
            userId: currentUserId,
            shopId: newShop.id,
            canView: true,
            canEdit: true
          }, ctx);
        } catch (accessError) {
          console.error("Error granting access to newly created shop:", accessError);
          // We don't want this to fail the whole creation process
        }
      }
      
      ctx.set.status = 201;   
      return {
        data: newShop,
        message: "Shop created successfully."
      }
    } catch (error: any) {
      if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ForbiddenError) {
        // These are custom errors with specific messages
        const statusCode = error instanceof BadRequestError ? 400 : 
                          error instanceof NotFoundError ? 404 : 403;
        ctx.set.status = statusCode;
        return { 
          error: error.message,
          type: error.constructor.name,
          timestamp: new Date().toISOString()
        };
      }
      
      // Handle database/service specific errors
      if (error.message?.includes('UNIQUE constraint failed')) {
        ctx.set.status = 400;
        return { 
          error: 'A shop with this name already exists. Please choose a different name.',
          field: 'name',
          type: 'UniqueConstraintError',
          timestamp: new Date().toISOString()
        };
      }

      if (error.message?.includes('NOT NULL constraint failed')) {
        const field = error.message.split('.').pop() || 'unknown';
        ctx.set.status = 400;
        return { 
          error: `Required field '${field}' is missing or invalid.`,
          field,
          type: 'NotNullConstraintError',
          timestamp: new Date().toISOString()
        };
      }
      
      // Log the original error for debugging
      console.error("Error in ShopController.create:", error);
      
      // Return a generic error message for unexpected errors
      ctx.set.status = 500;
      return { 
        error: 'An unexpected error occurred while creating the shop. Please try again or contact support.',
        type: 'InternalServerError',
        timestamp: new Date().toISOString()
      };
    }
  }

  async update(id: number, data: TShopUpdate, ctx: AuthContext) {
    try {
      if (Object.keys(data).length === 0) {
          throw new BadRequestError('No update data provided.');
      }

      // Shop manager can only update their managed shop
      if (ctx.user?.roleSlug === 'shop_manager') {
        if (ctx.user.managed_shop_id !== id) {
          throw new ForbiddenError('As a Shop Manager, you can only update your managed shop');
        }
      }
      // For other roles, check normal access permissions
      else if (ctx.user?.id) {
        const hasAccess = await userShopAccessController.checkAccess(ctx.user.id, id, true);
        if (!hasAccess) {
          throw new ForbiddenError('You do not have permission to update this shop');
        }
      }

      const updatedShop = await shopService.updateShop(id, data);
      return {
        data: updatedShop,
        message: "Shop updated successfully."
      }
    } catch (error: any) {
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
      console.error("Error in ShopController.update:", error);
      ctx.set.status = 500;
      return { error: 'Failed to update shop' };
    }
  }

  async delete(id: number, ctx: AuthContext) {
    try {
      // Shop managers cannot delete shops
      if (ctx.user?.roleSlug === 'shop_manager') {
        throw new ForbiddenError('Shop Managers do not have permission to delete shops');
      }

      // Check if user has edit access to this shop
      const userId = ctx.user?.id;
      if (userId) {
        const hasAccess = await userShopAccessController.checkAccess(userId, id, true);
        if (!hasAccess) {
          throw new ForbiddenError('You do not have permission to delete this shop');
        }
      }
      
      const result = await shopService.deleteShop(id);
      ctx.set.status = 200; // Or 204 if no content is returned, but we return a message
      return result; 
    } catch (error: any) {
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
      console.error("Error in ShopController.delete:", error);
      ctx.set.status = 500;
      return { error: 'Failed to delete shop' };
    }
  }

  async uploadLogo(id: number, file: File | Blob, ctx: AuthContext) {
    try {
      // Shop manager can only update their managed shop
      if (ctx.user?.roleSlug === 'shop_manager') {
        if (ctx.user.managed_shop_id !== id) {
          throw new ForbiddenError('As a Shop Manager, you can only update your managed shop');
        }
      }
      // For other roles, check normal access permissions
      else if (ctx.user?.id) {
        const hasAccess = await userShopAccessController.checkAccess(ctx.user.id, id, true);
        if (!hasAccess) {
          throw new ForbiddenError('You do not have permission to update this shop');
        }
      }
      
      // The id is already validated as numeric in the route handler
      const result = await shopService.uploadShopLogo(id, file);
      return {
        data: result,
        message: "Logo uploaded successfully."
      };
    } catch (error: any) {
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
      console.error(`Error in ShopController.uploadLogo for shop ID ${id}:`, error);
      ctx.set.status = 500;
      return { error: 'Failed to upload shop logo' };
    }
  }



  async getShopConfig(id: number, ctx: AuthContext) {
    try {    
      const config = await shopService.getShopConfig(id);
      return { data: config };
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        ctx.set.status = 404;
        return { error: error.message };
      }
      if (error instanceof ForbiddenError) {
        ctx.set.status = 403;
        return { error: error.message };
      }
      console.error(`Error in ShopController.getShopConfig for shop ID ${id}:`, error);
      ctx.set.status = 500;
      return { error: 'Failed to retrieve shop configuration' };
    }
  }

  async updateShopConfig(id: number, data: TShopConfigUpdate, ctx: AuthContext) {
    try {
      // Shop manager can only update their managed shop
      if (ctx.user?.roleSlug === 'shop_manager') {
        if (ctx.user.managed_shop_id !== id) {
          throw new ForbiddenError('As a Shop Manager, you can only update your managed shop configuration');
        }
      }
      // For other roles, check normal access permissions
      else if (ctx.user?.id) {
        const hasAccess = await userShopAccessController.checkAccess(ctx.user.id, id, true);
        if (!hasAccess) {
          throw new ForbiddenError('You do not have permission to update this shop configuration');
        }
      }
      
      const updatedConfig = await shopService.updateShopConfig(id, data.config);
      return {
        data: updatedConfig,
        message: "Shop configuration updated successfully."
      };
    } catch (error: any) {
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
      console.error(`Error in ShopController.updateShopConfig for shop ID ${id}:`, error);
      ctx.set.status = 500;
      return { error: 'Failed to update shop configuration' };
    }
  }
}

export const shopController = new ShopController(); 