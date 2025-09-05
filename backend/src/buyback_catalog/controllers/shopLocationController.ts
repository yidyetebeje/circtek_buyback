import { type Context } from 'elysia';
import { shopLocationRepository } from '../repositories/shopLocationRepository';
import { 
  TShopLocationCreateValidated,
  TShopLocationUpdateValidated 
} from '../types/shopTypes';
import { JwtUser } from '../types/authTypes';

interface AuthenticatedContext extends Context {
  user: JwtUser | null;
}

export class ShopLocationController {
  /**
   * Get all locations for a specific shop
   */
  async getByShopId(
    shopId: number,
    query: {
      page?: number;
      limit?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
      activeOnly?: boolean;
    },
    ctx: AuthenticatedContext
  ) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const orderBy = query.orderBy || 'displayOrder';
      const order = query.order || 'asc';
      const activeOnly = query.activeOnly !== undefined ? query.activeOnly : true;

      const result = await shopLocationRepository.findByShopId(
        shopId,
        page,
        limit,
        orderBy,
        order,
        activeOnly
      );

      return {
        success: true,
        data: result.data,
        meta: result.meta
      };
    } catch (error) {
      console.error('Error fetching shop locations:', error);
      ctx.set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch shop locations'
      };
    }
  }

  /**
   * Get location by ID
   */
  async getById(id: number, ctx: AuthenticatedContext) {
    try {
      const location = await shopLocationRepository.findById(id);
      
      if (!location) {
        ctx.set.status = 404;
        return {
          success: false,
          error: 'Shop location not found'
        };
      }

      return {
        success: true,
        data: location
      };
    } catch (error) {
      console.error('Error fetching shop location:', error);
      ctx.set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch shop location'
      };
    }
  }

  /**
   * Find nearby locations
   */
  async findNearby(
    query: {
      latitude: number;
      longitude: number;
      radius?: number;
      shopId?: number;
      limit?: number;
    },
    ctx: AuthenticatedContext
  ) {
    try {
      const { latitude, longitude, radius = 50, shopId, limit = 10 } = query;

      if (!latitude || !longitude) {
        ctx.set.status = 400;
        return {
          success: false,
          error: 'Latitude and longitude are required'
        };
      }

      const locations = await shopLocationRepository.findNearby(
        latitude,
        longitude,
        radius,
        shopId,
        limit
      );

      return {
        success: true,
        data: locations
      };
    } catch (error) {
      console.error('Error finding nearby locations:', error);
      ctx.set.status = 500;
      return {
        success: false,
        error: 'Failed to find nearby locations'
      };
    }
  }

  /**
   * Create new location
   */
  async create(
    data: TShopLocationCreateValidated,
    ctx: AuthenticatedContext
  ) {
    try {
      // TODO: Add authorization check here
      // Ensure user has permission to create locations for this shop

      const location = await shopLocationRepository.create(data);
      
      if (!location) {
        ctx.set.status = 500;
        return {
          success: false,
          error: 'Failed to create shop location'
        };
      }

      ctx.set.status = 201;
      return {
        success: true,
        data: location
      };
    } catch (error) {
      console.error('Error creating shop location:', error);
      ctx.set.status = 500;
      return {
        success: false,
        error: 'Failed to create shop location'
      };
    }
  }

  /**
   * Update location
   */
  async update(
    id: number,
    data: TShopLocationUpdateValidated,
    ctx: AuthenticatedContext
  ) {
    try {
      // TODO: Add authorization check here
      // Ensure user has permission to update locations for this shop

      const location = await shopLocationRepository.update(id, data);
      
      if (!location) {
        ctx.set.status = 404;
        return {
          success: false,
          error: 'Shop location not found'
        };
      }

      return {
        success: true,
        data: location
      };
    } catch (error) {
      console.error('Error updating shop location:', error);
      ctx.set.status = 500;
      return {
        success: false,
        error: 'Failed to update shop location'
      };
    }
  }

  /**
   * Delete location
   */
  async delete(id: number, ctx: AuthenticatedContext) {
    try {
      // TODO: Add authorization check here
      // Ensure user has permission to delete locations for this shop

      const success = await shopLocationRepository.delete(id);
      
      if (!success) {
        ctx.set.status = 404;
        return {
          success: false,
          error: 'Shop location not found'
        };
      }

      ctx.set.status = 204;
      return {
        success: true,
        message: 'Shop location deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting shop location:', error);
      ctx.set.status = 500;
      return {
        success: false,
        error: 'Failed to delete shop location'
      };
    }
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: number, ctx: AuthenticatedContext) {
    try {
      // TODO: Add authorization check here

      const location = await shopLocationRepository.toggleActive(id);
      
      if (!location) {
        ctx.set.status = 404;
        return {
          success: false,
          error: 'Shop location not found'
        };
      }

      return {
        success: true,
        data: location,
        message: `Shop location ${location.isActive ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      console.error('Error toggling shop location status:', error);
      ctx.set.status = 500;
      return {
        success: false,
        error: 'Failed to toggle shop location status'
      };
    }
  }
}

export const shopLocationController = new ShopLocationController(); 