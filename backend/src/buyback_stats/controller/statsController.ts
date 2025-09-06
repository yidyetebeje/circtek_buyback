import { Elysia, Static, t, type Context } from "elysia";
import { statsService, StatsService } from "../services/statsService";
import { 
    DateRangeQuerySchema, 
    TopDevicesQuerySchema, 
    TopShopsQuerySchema, 
    ShopIdParamsSchema,
    TimeSeriesQuerySchema
} from "../types";

export class StatsController {
  constructor(private service: StatsService) {}
  async getPlatformOverview({ query, currentRole, currentTenantId, currentUserId, set }: { query: Static<typeof DateRangeQuerySchema>, currentRole: string, currentTenantId: number, currentUserId: number, set: Context['set'] }) {
    try {
      const user = { id: currentUserId, roleSlug: currentRole, tenant_id: currentTenantId };
      const overview = await this.service.getPlatformOverview(query, user);
      return { success: true, data: overview };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve platform overview statistics", details: message };
    }
  }

  async getPlatformTopDevices({ query, currentRole, currentTenantId, currentUserId, set }: { query: Static<typeof TopDevicesQuerySchema>, currentRole: string, currentTenantId: number, currentUserId: number, set: Context['set'] }) {
    try {
      const user = { id: currentUserId, roleSlug: currentRole, tenant_id: currentTenantId };
      const topDevices = await this.service.getPlatformTopDevices(query, user);
      return { success: true, data: topDevices };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve platform top devices statistics", details: message };
    }
  }

  async getPlatformTopShops({ query, currentRole, currentTenantId, currentUserId, set }: { query: Static<typeof TopShopsQuerySchema>, currentRole: string, currentTenantId: number, currentUserId: number, set: Context['set'] }) {
    try {
      const user = { id: currentUserId, roleSlug: currentRole, tenant_id: currentTenantId };
      const topShops = await this.service.getPlatformTopShops(query, user);
      return { success: true, data: topShops };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve platform top shops statistics", details: message };
    }
  }

  // Shop-Specific Statistics - Unified handlers
  async getShopOverview({ params, query, currentRole, currentTenantId, currentUserId, set }: { params: Static<typeof ShopIdParamsSchema>, query: Static<typeof DateRangeQuerySchema>, currentRole: string, currentTenantId: number, currentUserId: number, set: Context['set'] }) {
    try {
      const user = { id: currentUserId, roleSlug: currentRole, tenant_id: currentTenantId };
      const result = await this.service.getShopOverview(params.shopId, query, user);
      
      if ('error' in result) {
        if (result.error.toLowerCase().includes("access denied")) {
          set.status = 403;
          return { success: false, error: result.error };
        } else if (result.error.toLowerCase().includes("not found")) {
          set.status = 404;
          return { success: false, error: result.error };
        }
        // Default to 500 or a more specific error if the service returns other error structures
        set.status = 500;
        return { success: false, error: result.error || "Failed to retrieve shop overview" };
      }
      return { success: true, data: result };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve shop overview statistics", details: message };
    }
  }
  
  // This method is for the /my-shop routes, ensuring user.shopId is used.
  async getMyShopOverview({ query, currentRole, currentTenantId, currentUserId, shopId, set }: { query: Static<typeof DateRangeQuerySchema>, currentRole: string, currentTenantId: number, currentUserId: number, shopId: number, set: Context['set'] }) {
    try {
      if (!currentUserId || !currentTenantId || currentTenantId <= 0) { // Ensure user.id for service call, and user.shopId for this specific route
        set.status = 403; 
        return { success: false, error: "User is not associated with a valid shop or user ID is missing." };
      }
      const user = { id: currentUserId, roleSlug: currentRole, tenant_id: currentTenantId, shopId: shopId };
      // Call the generic getShopOverview, but pass user.shopId as the target shopId
      // The service will still perform its access checks using the full user object.
      const result = await this.service.getShopOverview(currentTenantId, query, user);

      if ('error' in result) {
        if (result.error.toLowerCase().includes("access denied")) {
          set.status = 403;
          return { success: false, error: result.error };
        } else if (result.error.toLowerCase().includes("not found")) {
          set.status = 404;
          return { success: false, error: result.error };
        }
        set.status = 500;
        return { success: false, error: result.error || "Failed to retrieve shop overview" };
      }
      return { success: true, data: result };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve current shop overview statistics", details: message };
    }
  }

  async getShopTopDevices({ params, query, currentRole, currentTenantId, currentUserId, set }: { params: Static<typeof ShopIdParamsSchema>, query: Static<typeof TopDevicesQuerySchema>, currentRole: string, currentTenantId: number, currentUserId: number, set: Context['set'] }) {
    try {
      const user = { id: currentUserId, roleSlug: currentRole, tenant_id: currentTenantId };
      const result = await this.service.getShopTopDevices(params.shopId, query, user);

      if ('error' in result) {
        if (result.error.toLowerCase().includes("access denied")) {
          set.status = 403;
          return { success: false, error: result.error };
        } else if (result.error.toLowerCase().includes("not found")) {
          set.status = 404;
          return { success: false, error: result.error };
        }
        set.status = 500;
        return { success: false, error: result.error || "Failed to retrieve shop top devices" };
      }
      return { success: true, data: result };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve shop top devices statistics", details: message };
    }
  }

  // This method is for the /my-shop routes
  async getMyShopTopDevices({ query, currentRole, currentTenantId, currentUserId, shopId, set }: { query: Static<typeof TopDevicesQuerySchema>, currentRole: string, currentTenantId: number, currentUserId: number, shopId: number, set: Context['set'] }) {
    try {
      if (!currentUserId || !currentTenantId || currentTenantId <= 0) { // Ensure user.id for service call, and user.shopId
        set.status = 403;
        return { success: false, error: "User is not associated with a valid shop or user ID is missing." };
      }
      const user = { id: currentUserId, roleSlug: currentRole, tenant_id: currentTenantId, shopId: shopId };
      // Call the generic getShopTopDevices, passing user.shopId as target and full user object
      const result = await this.service.getShopTopDevices(shopId, query, user);

      if ('error' in result) {
        if (result.error.toLowerCase().includes("access denied")) {
          set.status = 403;
          return { success: false, error: result.error };
        } else if (result.error.toLowerCase().includes("not found")) {
          set.status = 404;
          return { success: false, error: result.error };
        }
        set.status = 500;
        return { success: false, error: result.error || "Failed to retrieve shop top devices" };
      }
      return { success: true, data: result };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve current shop top devices statistics", details: message };
    }
  }

  // New: Shop Catalog Overview
  async getShopCatalogOverview({ params, set }: { params: Static<typeof ShopIdParamsSchema>, set: Context['set'] }) {
    try {
      const data = await this.service.getShopCatalogOverview(params.shopId);
      return { success: true, data };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve catalog overview", details: message };
    }
  }

  async getModelsPerCategory({ params, set }: { params: Static<typeof ShopIdParamsSchema>, set: Context['set'] }) {
    try {
      const data = await this.service.getModelsPerCategory(params.shopId);
      return { success: true, data };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve models per category", details: message };
    }
  }

  async getModelsPerBrand({ params, set }: { params: Static<typeof ShopIdParamsSchema>, set: Context['set'] }) {
    try {
      const data = await this.service.getModelsPerBrand(params.shopId);
      return { success: true, data };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve models per brand", details: message };
    }
  }

  // Time Series Methods
  async getPlatformTimeSeries({ query, currentRole, currentTenantId, currentUserId, set }: { query: Static<typeof TimeSeriesQuerySchema>, currentRole: string, currentTenantId: number, currentUserId: number, set: Context['set'] }) {
    try {
      const user = { id: currentUserId, roleSlug: currentRole, tenant_id: currentTenantId };
      const timeSeries = await this.service.getPlatformTimeSeries(query, user);
      return { success: true, data: timeSeries };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve platform time series", details: message };
    }
  }

  async getShopTimeSeries({ params, query, currentRole, currentTenantId, currentUserId, set }: { params: Static<typeof ShopIdParamsSchema>, query: Static<typeof TimeSeriesQuerySchema>, currentRole: string, currentTenantId: number, currentUserId: number, set: Context['set'] }) {
    try {
      const user = { id: currentUserId, roleSlug: currentRole, tenant_id: currentTenantId };
      const result = await this.service.getShopTimeSeries(params.shopId, query, user);
      
      if ('error' in result) {
        if (result.error.toLowerCase().includes("access denied")) {
          set.status = 403;
          return { success: false, error: result.error };
        } else if (result.error.toLowerCase().includes("not found")) {
          set.status = 404;
          return { success: false, error: result.error };
        }
        set.status = 500;
        return { success: false, error: result.error || "Failed to retrieve shop time series" };
      }
      return { success: true, data: result };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve shop time series", details: message };
    }
  }

  async getMyShopTimeSeries({ query, currentRole, currentTenantId, currentUserId, shopId, set }: { query: Static<typeof TimeSeriesQuerySchema>, currentRole: string, currentTenantId: number, currentUserId: number, shopId: number, set: Context['set'] }) {
    try {
      if (!currentUserId || !currentTenantId || currentTenantId <= 0) {
        set.status = 403;
        return { success: false, error: "User is not associated with a valid shop or user ID is missing." };
      }
      
      const user = { id: currentUserId, roleSlug: currentRole, tenant_id: currentTenantId, shopId: shopId };
      const result = await this.service.getShopTimeSeries(currentTenantId, query, user);

      if ('error' in result) {
        if (result.error.toLowerCase().includes("access denied")) {
          set.status = 403;
          return { success: false, error: result.error };
        } else if (result.error.toLowerCase().includes("not found")) {
          set.status = 404;
          return { success: false, error: result.error };
        }
        set.status = 500;
        return { success: false, error: result.error || "Failed to retrieve shop time series" };
      }
      return { success: true, data: result };
    } catch (error: unknown) {
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: "Failed to retrieve current shop time series", details: message };
    }
  }
}

export const statsController = new StatsController(statsService); 