import { FeaturedDeviceRepository } from '@/catalog/repositories/featuredDeviceRepository';
import { NewFeaturedDevice, FeaturedDevice, NewFeaturedDeviceSchema } from '@/catalog/types/featuredDeviceTypes';
import { AppContext } from '@/catalog/types/contextTypes'; // Assuming a common context type
import { Static } from 'elysia';
import { shopAccessService } from '@/roles/services/shopAccessService';
import { db } from '@/db';
import { shops } from '@/db/schema/catalog';
import { inArray } from 'drizzle-orm';

const repository = new FeaturedDeviceRepository();

export const featuredDeviceController = {
  async create(data: Static<typeof NewFeaturedDeviceSchema>, ctx: AppContext): Promise<FeaturedDevice | { error: string }> {
    const { user } = ctx;
    if (!user || !user.id) {
        ctx.set.status = 403;
        return { error: 'Unauthorized access.' };
    }
    
    // Check if user has access to the shop
    if (data.shopId) {
        const hasShopAccess = await shopAccessService.hasShopAccess(user.id, data.shopId);
        if (!hasShopAccess && user.roleSlug !== 'super-admin') {
            ctx.set.status = 403;
            return { error: 'You do not have access to this shop.' };
        }
    } else {
        ctx.set.status = 400;
        return { error: 'Shop ID is required.' };
    }
    
    // Ensure clientId from authenticated user is used, or allow if super-admin
    const createData: NewFeaturedDevice = {
        ...data,
        // Ensure clientId is a valid number
        clientId: (user.roleSlug === 'super-admin' && data.clientId) ? 
            data.clientId : 
            (user.clientId || 0), // Default to 0 if no client ID available
        // Ensure shopId and modelId are present
        shopId: data.shopId as number, // We already validated shopId exists above
        modelId: data.modelId as number, // Type assertion as we expect this to be provided
        isPublished: data.isPublished !== undefined ? data.isPublished : false, // Default to false if not provided
    };

    try {
      const featuredDevice = await repository.createFeaturedDevice(createData);
      if (!featuredDevice) {
        ctx.set.status = 500;
        return { error: 'Failed to create featured device.' };
      }
      ctx.set.status = 201;
      return featuredDevice;
    } catch (error: any) {
      console.error('Error creating featured device:', error);
      ctx.set.status = 500;
      // Check for unique constraint violation (example for PostgreSQL, adjust for MySQL)
      if (error.message?.includes('unique constraint')) { // Adjust error check for MySQL (e.g., ER_DUP_ENTRY)
        ctx.set.status = 409; // Conflict
        return { error: 'This model is already featured for this shop.' };
      }
      return { error: 'An unexpected error occurred.' };
    }
  },

  async getAll(ctx: AppContext & { query: {
    page?: number;
    limit?: number;
    orderBy?: 'createdAt' | 'updatedAt';
    order?: 'asc' | 'desc';
    shopId?: number;
    modelId?: number;
    clientId?: number;
    isPublished?: boolean;
    modelTitle?: string;
    shopName?: string;
  }}) : Promise<{ data: FeaturedDevice[]; total: number; page: number; limit: number } | { error: string }> {
    const { user, query } = ctx;
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    let shopIdsToFilter: number[] | undefined;

    let queriedShopIds: number[] | undefined;
    if (query.shopName) {
      const shopNames = query.shopName.split(',');
      if (shopNames.length > 0) {
        const shopRecords = await db.select({ id: shops.id }).from(shops).where(inArray(shops.name, shopNames));
        queriedShopIds = shopRecords.map(s => s.id);
      }
    } else if (query.shopId) {
      queriedShopIds = [query.shopId];
    }

    if (user && user.roleSlug === 'super-admin') {
      // Super admin can query any shops
      shopIdsToFilter = queriedShopIds;
    } else if (user) {
      // Regular authenticated user – restrict to shops they manage/have access to
      const userAccessibleShopIds = await shopAccessService.getAccessibleShopIds(user.id);
      if (queriedShopIds) {
        shopIdsToFilter = userAccessibleShopIds.filter(id => queriedShopIds!.includes(id));
      } else {
        shopIdsToFilter = userAccessibleShopIds;
      }
    } else {
      // Public (unauthenticated) access – only allow published featured devices
      shopIdsToFilter = queriedShopIds;
    }

    if (queriedShopIds && shopIdsToFilter?.length === 0) {
      return { data: [], total: 0, page, limit };
    }

    let filterClientId: number | undefined;
    if (user) {
      filterClientId = user.roleSlug === 'super-admin' ? query.clientId : user.clientId;
    } else {
      // Public requests may optionally filter by clientId via query params
      filterClientId = query.clientId;
    }

    // For unauthenticated requests, always enforce published items
    const effectiveIsPublished = user ? query.isPublished : true;

    const repoFilters = {
      shopIds: shopIdsToFilter,
      modelId: query.modelId,
      modelTitle: query.modelTitle,
      clientId: filterClientId,
      isPublished: effectiveIsPublished,
      orderBy: query.orderBy || 'createdAt',
      orderDirection: query.order || 'desc',
      limit,
      offset
    };

    try {
      const data = await repository.getFeaturedDevices(repoFilters);
      const total = await repository.countFeaturedDevices(repoFilters);
      return { data, total, page, limit };
    } catch (error: any) {
      console.error('Error fetching featured devices:', error);
      ctx.set.status = 500;
      return { error: 'Failed to fetch featured devices.' };
    }
  },

  async getById(id: number, ctx: AppContext): Promise<FeaturedDevice | { error: string }> {
    const { user } = ctx;
     if (!user || !user.id) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
    }
    try {
      const featuredDevice = await repository.getFeaturedDeviceById(id);
      if (!featuredDevice) {
        ctx.set.status = 404;
        return { error: 'Featured device not found.' };
      }
      
      // Check if user has access to the shop associated with this featured device
      const hasPermission = 
        user.roleSlug === 'super-admin' || 
        (featuredDevice.clientId === user.clientId) || 
        (await shopAccessService.hasShopAccess(user.id, featuredDevice.shopId));
        
      if (!hasPermission) {
        ctx.set.status = 403;
        return { error: 'Forbidden: You do not have access to this resource.' };
      }
      
      return featuredDevice;
    } catch (error) {
      console.error(`Error fetching featured device ${id}:`, error);
      ctx.set.status = 500;
      return { error: 'Failed to fetch featured device.' };
    }
  },

  async update(id: number, data: Partial<Pick<NewFeaturedDevice, 'isPublished'>>, ctx: AppContext): Promise<FeaturedDevice | { error: string }> {
    const { user } = ctx;
    if (!user || !user.id) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
    }
    try {
      // First, retrieve the device to check permissions
      const existingDevice = await repository.getFeaturedDeviceById(id);
      if (!existingDevice) {
        ctx.set.status = 404;
        return { error: 'Featured device not found.' };
      }
      
      // Check if user has access to the shop or is the client owner or super-admin
      const hasPermission = 
        user.roleSlug === 'super-admin' || 
        (existingDevice.clientId === user.clientId) || 
        (await shopAccessService.hasShopAccess(user.id, existingDevice.shopId));
        
      if (!hasPermission) {
        ctx.set.status = 403;
        return { error: 'Forbidden: You do not have permission to update this resource.' };
      }

      const updatedDevice = await repository.updateFeaturedDevice(id, data);
      if (!updatedDevice) {
        ctx.set.status = 404; // Or 500 if update failed for other reasons
        return { error: 'Failed to update featured device or device not found.' };
      }
      return updatedDevice;
    } catch (error) {
      console.error(`Error updating featured device ${id}:`, error);
      ctx.set.status = 500;
      return { error: 'Failed to update featured device.' };
    }
  },

  async delete(id: number, ctx: AppContext): Promise<{ success: boolean } | { error: string }> {
    const { user } = ctx;
    if (!user || !user.id) {
        ctx.set.status = 401;
        return { error: 'Unauthorized' };
    }
    try {
      const existingDevice = await repository.getFeaturedDeviceById(id);
      if (!existingDevice) {
        ctx.set.status = 404;
        return { error: 'Featured device not found.' };
      }
      
      // Check if user has access to the shop or is the client owner or super-admin
      const hasPermission = 
        user.roleSlug === 'super-admin' || 
        (existingDevice.clientId === user.clientId) || 
        (await shopAccessService.hasShopAccess(user.id, existingDevice.shopId));
        
      if (!hasPermission) {
        ctx.set.status = 403;
        return { error: 'Forbidden: You do not have permission to delete this resource.' };
      }

      const result = await repository.deleteFeaturedDevice(id);
      if (!result.success) {
        ctx.set.status = 404; // Or 500
        return { error: 'Failed to delete featured device or device not found.' };
      }
      ctx.set.status = 200; // Or 204 No Content
      return { success: true };
    } catch (error) {
      console.error(`Error deleting featured device ${id}:`, error);
      ctx.set.status = 500;
      return { error: 'Failed to delete featured device.' };
    }
  }
};
