import { statsRepository, StatsRepository } from "../repository/statsRepository";
import { ORDER_STATUS } from "../../db/order.schema";
import { shops as shopsSchema } from "../../db/shops.schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { 
    PlatformOverviewSuccessResponseSchema, 
    TopDevicesQuerySchema, 
    TopDevicesSuccessResponseSchema, 
    TopShopsQuerySchema, 
    TopShopsSuccessResponseSchema, 
    ShopOverviewSuccessResponseSchema, 
    ShopTopDevicesSuccessResponseSchema,
    DateRangeQuerySchema,
    TopDeviceItemSchema, // Import for mapping
    TopShopItemSchema,   // Import for mapping
    AuthenticatedUserSchema, // Added AuthenticatedUserSchema
    TimeSeriesQuerySchema,
    PlatformTimeSeriesResponseSchema,
    ShopTimeSeriesResponseSchema
} from "../types";
import { Static } from "elysia";
import { getAllowedShopIds } from "../../utils/access-control-buyback";

type DateRange = Static<typeof DateRangeQuerySchema>;
// Define a type for user, which might be null if not authenticated or if token is invalid
type User = Static<typeof AuthenticatedUserSchema> | null;

export class StatsService {
  constructor(private repository: StatsRepository) {}

  private calculateAverage(totalValue: number, count: number): number {
    return count > 0 ? parseFloat((totalValue / count).toFixed(2)) : 0;
  }

  async getPlatformOverview(
    dateRange?: DateRange, 
    user?: User
  ): Promise<Static<typeof PlatformOverviewSuccessResponseSchema>> {
    let shopIdInput: { accessibleShopIds: number[] } | undefined = undefined;
    let allowedShopIdsForTimeSeries: number[] | undefined = undefined;

    if (user?.id) {
      const rawShopIds = await getAllowedShopIds(user.id, user.roleSlug, user.shopId);
      if (rawShopIds !== undefined) {
        const allowedShopIds = rawShopIds;
        shopIdInput = { accessibleShopIds: allowedShopIds }; 
        allowedShopIdsForTimeSeries = allowedShopIds;
      }
    }

    const totalOrders = await this.repository.getTotalOrders(dateRange, shopIdInput);
    const ordersByStatus = await this.repository.getOrdersByStatus(dateRange, shopIdInput);
    const orderValues = await this.repository.getOrderValues(dateRange, shopIdInput);
    
    const averageEstimatedOrderValue = this.calculateAverage(orderValues.totalEstimatedValue, totalOrders);   
    const averageFinalOrderValue = this.calculateAverage(orderValues.totalFinalValue, orderValues.totalCompletedOrdersForFinalValue);

    return {
      totalOrders,
      ordersByStatus,
      totalEstimatedValue: orderValues.totalEstimatedValue,
      totalFinalValue: orderValues.totalFinalValue,
      averageEstimatedOrderValue,
      averageFinalOrderValue,
      // timeSeries: timeSeries 
    };
  }

  async getPlatformTopDevices(
    queryParams: Static<typeof TopDevicesQuerySchema>, 
    user?: User
  ): Promise<Static<typeof TopDevicesSuccessResponseSchema>> {
    const { limit = 10, sortBy = 'count', dateFrom, dateTo } = queryParams;
    let allowedShopIds: number[] | undefined = undefined;

    if (user?.id) {
      const rawShopIds = await getAllowedShopIds(user.id, user.roleSlug, user.shopId);
      if (rawShopIds !== undefined) {
        allowedShopIds = rawShopIds;
        if (allowedShopIds.length === 0) {
          return { topDevices: [] };
        }
      }
      // If rawShopIds is undefined, leave allowedShopIds as undefined (unrestricted access)
    }
    // If user is undefined, allowedShopIds remains undefined, repo fetches unrestricted (if allowed by design).

    const topDevicesData = await this.repository.getPlatformTopDevices(limit, sortBy, { dateFrom, dateTo }, allowedShopIds);
    
    const mappedDevices: Static<typeof TopDeviceItemSchema>[] = topDevicesData.map(device => ({
        deviceId: device.deviceId, // Not null based on repo query (isNotNull)
        modelName: device.modelName || "Unknown Model",
        brandName: device.brandName === null ? undefined : device.brandName,
        seriesName: device.seriesName === null ? undefined : device.seriesName,
        orderCount: device.orderCount,
        totalFinalValue: device.totalFinalValue
    }));
    return { topDevices: mappedDevices };
  }

  async getPlatformTopShops(
    queryParams: Static<typeof TopShopsQuerySchema>, 
    user: User 
  ): Promise<Static<typeof TopShopsSuccessResponseSchema>> {
    const { limit = 10, sortBy = 'orderCount', dateFrom, dateTo } = queryParams;
    let allowedShopIds: number[] | undefined = undefined;

    if (user?.id) { // Always fetch if user.id exists, regardless of role
      const rawShopIds = await getAllowedShopIds(user.id, user.roleSlug, user.shopId);
      if (rawShopIds !== undefined) {
        allowedShopIds = rawShopIds;
        if (allowedShopIds.length === 0) {
          return { topShops: [] }; // No accessible shops means no top shops to list.
        }
      }
      // If rawShopIds is undefined, leave allowedShopIds as undefined (unrestricted access)
    }
    // If user is null or user.id is null, allowedShopIds remains undefined. Repository will not filter by shops.
    // This implies a public/unrestricted view if no user is provided, which should be controlled at route level.

    const topShopsData = await this.repository.getPlatformTopShops(limit, sortBy, { dateFrom, dateTo }, allowedShopIds);

    const mappedShops: Static<typeof TopShopItemSchema>[] = topShopsData
        .filter(shop => shop.shopId !== null && shop.shopName !== null) // Filter out shops with null id or name before mapping
        .map(shop => ({
            shopId: shop.shopId!, // Non-null asserted due to filter
            shopName: shop.shopName!, // Non-null asserted due to filter
            orderCount: shop.orderCount,
            totalFinalValue: shop.totalFinalValue
        }));
    
    return { topShops: mappedShops };
  }

  private async getShopName(shopId: number): Promise<string> {
    if (shopId <= 0) return "Invalid Shop ID"; // Should ideally be caught by validation
    const shopDetails = await db.select({ name: shopsSchema.name }).from(shopsSchema).where(eq(shopsSchema.id, shopId)).limit(1);
    if (!shopDetails || shopDetails.length === 0 || !shopDetails[0].name) {
        return `SHOP_NOT_FOUND_${shopId}`; // Special string for controller to check or if name is null
    }
    return shopDetails[0].name; // Fixed: Ensure name exists or return the placeholder
  }

  async getShopOverview(
    shopId: number, 
    dateRange?: DateRange, 
    user?: User 
  ): Promise<Static<typeof ShopOverviewSuccessResponseSchema> | { error: string, shopId: number, shopName: string }> {
    if (!user?.id) {
      // This case should ideally be blocked by route authentication.
      // If reached, implies an attempt to access specific shop stats without authentication.
      return { error: "Authentication required for shop statistics", shopId: shopId, shopName: "Access Denied" };
    }

    const rawAllowedShopIds = await getAllowedShopIds(user.id, user.roleSlug, user.shopId);
    
    // Fix: Handle undefined properly for clients (unrestricted access)
    if (rawAllowedShopIds !== undefined && !rawAllowedShopIds.includes(shopId)) {
      return { error: "Access denied to this shop's statistics", shopId: shopId, shopName: "Access Denied" };
    }
    // If rawAllowedShopIds is undefined, user has unrestricted access (admin/client)

    const shopName = await this.getShopName(shopId);
    if (shopName.startsWith("SHOP_NOT_FOUND_")) {
      return { error: "Shop not found", shopId: shopId, shopName: "Not Found" };
    }
    
    // Pass allowedShopIds to repository methods that support it for safety, though shopId is primary filter here.
    // The main check is `allowedShopIds.includes(shopId)` above.
    const totalOrders = await this.repository.getTotalOrders(dateRange, shopId ); // shopId is already confirmed accessible
    const ordersByStatus = await this.repository.getOrdersByStatus(dateRange, shopId );
    const orderValues = await this.repository.getOrderValues(dateRange, shopId );
    
    const averageEstimatedOrderValue = this.calculateAverage(orderValues.totalEstimatedValue, totalOrders); 
    const averageFinalOrderValue = this.calculateAverage(orderValues.totalFinalValue, orderValues.totalCompletedOrdersForFinalValue);

    return {
      shopId,
      shopName,
      totalOrders,
      ordersByStatus,
      totalEstimatedValue: orderValues.totalEstimatedValue,
      totalFinalValue: orderValues.totalFinalValue,
      averageEstimatedOrderValue,
      averageFinalOrderValue,
    };
  }

  async getShopTopDevices(
    shopId: number, 
    queryParams: Static<typeof TopDevicesQuerySchema>, 
    user?: User 
  ): Promise<Static<typeof ShopTopDevicesSuccessResponseSchema> | { error: string, shopId: number, shopName: string, topDevices: [] }> {
    
    if (!user?.id) {
      return { error: "Authentication required for shop device statistics", shopId: shopId, shopName: "Access Denied", topDevices: [] };
    }

    const rawAllowedShopIds = await getAllowedShopIds(user.id, user.roleSlug, user.shopId);
    
    // Fix: Handle undefined properly for clients (unrestricted access)
    if (rawAllowedShopIds !== undefined && !rawAllowedShopIds.includes(shopId)) {
      return { error: "Access denied to this shop's device statistics", shopId: shopId, shopName: "Access Denied", topDevices: [] };
    }
    // If rawAllowedShopIds is undefined, user has unrestricted access (admin/client)

    const shopName = await this.getShopName(shopId);
    if (shopName.startsWith("SHOP_NOT_FOUND_")) {
        return { error: "Shop not found", shopId: shopId, shopName: "Not Found", topDevices: [] };
    }

    const { limit = 5, sortBy = 'count', dateFrom, dateTo } = queryParams; 
    // Pass allowedShopIds to repository for consistency/safety, though shopId is primary filter.
    const topDevicesData = await this.repository.getShopTopDevices(shopId, limit, sortBy, { dateFrom, dateTo }, rawAllowedShopIds);
    
    const mappedDevices: Static<typeof TopDeviceItemSchema>[] = topDevicesData.map(device => ({
        deviceId: device.deviceId, // Not null from repo query (isNotNull)
        modelName: device.modelName || "Unknown Model",
        brandName: device.brandName === null ? undefined : device.brandName,
        seriesName: device.seriesName === null ? undefined : device.seriesName,
        orderCount: device.orderCount,
        totalFinalValue: device.totalFinalValue
    }));

    return { 
      shopId, 
      shopName, // This will be "Access Denied" or "Not Found" in error cases
      topDevices: mappedDevices 
    };
  }

  async getShopCatalogOverview(shopId: number): Promise<{
    published: { categories: number; brands: number; series: number; models: number; featuredDevices: number };
    unpublishedModels: number;
    stockDevices: number;
    openOrders: number;
    completedOrdersThisMonth: number;
  }> {
    const publishedCounts = await this.repository.getPublishedEntityCounts(shopId);
    const unpublishedModels = await this.repository.getUnpublishedModelCount(shopId);
    const quickStats = await this.repository.getStockAndOrderQuickStats(shopId);

    return {
      published: {
        categories: publishedCounts.categories,
        brands: publishedCounts.brands,
        series: publishedCounts.series,
        models: publishedCounts.models,
        featuredDevices: publishedCounts.featured,
      },
      unpublishedModels,
      stockDevices: quickStats.stock,
      openOrders: quickStats.openOrders,
      completedOrdersThisMonth: quickStats.completedOrdersThisMonth,
    };
  }

  async getModelsPerCategory(shopId: number) {
    return this.repository.getModelsPerCategory(shopId);
  }

  async getModelsPerBrand(shopId: number) {
    return this.repository.getModelsPerBrand(shopId);
  }

  // Time Series Methods
  async getPlatformTimeSeries(
    queryParams: Static<typeof TimeSeriesQuerySchema>,
    user?: User
  ): Promise<Static<typeof PlatformTimeSeriesResponseSchema>> {
    const { dateFrom, dateTo, period } = queryParams;
    let allowedShopIds: number[] | undefined = undefined;

    if (user?.id) {
      const rawShopIds = await getAllowedShopIds(user.id, user.roleSlug, user.shopId);
      if (rawShopIds !== undefined) {
        allowedShopIds = rawShopIds;
        if (allowedShopIds.length === 0) {
          return { timeSeries: [] };
        }
      }
    }

    const timeSeriesData = await this.repository.getPlatformOrderTimeSeries(
      { dateFrom, dateTo },
      period,
      allowedShopIds
    );

    return { timeSeries: timeSeriesData };
  }

  async getShopTimeSeries(
    shopId: number,
    queryParams: Static<typeof TimeSeriesQuerySchema>,
    user?: User
  ): Promise<Static<typeof ShopTimeSeriesResponseSchema> | { error: string, shopId: number, shopName: string, timeSeries: [] }> {
    if (!user?.id) {
      return { error: "Authentication required for shop time series", shopId: shopId, shopName: "Access Denied", timeSeries: [] };
    }

    const rawAllowedShopIds = await getAllowedShopIds(user.id, user.roleSlug, user.shopId);
    
    if (rawAllowedShopIds !== undefined && !rawAllowedShopIds.includes(shopId)) {
      return { error: "Access denied to this shop's time series", shopId: shopId, shopName: "Access Denied", timeSeries: [] };
    }

    const shopName = await this.getShopName(shopId);
    if (shopName.startsWith("SHOP_NOT_FOUND_")) {
      return { error: "Shop not found", shopId: shopId, shopName: "Not Found", timeSeries: [] };
    }

    const { dateFrom, dateTo, period } = queryParams;
    const timeSeriesData = await this.repository.getShopOrderTimeSeries(
      shopId,
      { dateFrom, dateTo },
      period,
      rawAllowedShopIds
    );

    return { 
      shopId, 
      shopName, 
      timeSeries: timeSeriesData 
    };
  }
}

export const statsService = new StatsService(statsRepository); 