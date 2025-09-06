import { db } from "../../db";
import { orders, ORDER_STATUS, OrderStatus } from "../../db/order.schema";
import { models, brands, model_series, device_categories, featured_devices } from "../../db/buyback_catalogue.schema";
import { shop_device_categories, shop_brands, shop_model_series, shop_models } from "../../db/shops.schema";
import { shops, user_shop_access } from "../../db/shops.schema";
import { devices } from "../../db/circtek.schema";
import { and, count, desc, eq, sum, gte, lte, SQL, sql, isNotNull, ne, asc, inArray } from "drizzle-orm";
import { warehouses } from "../../db/circtek.schema";

// Helper type for date range filtering
type DateRange = {
  dateFrom?: string;
  dateTo?: string;
};

// Define more specific return types for our repository methods
type TopDeviceQueryResult = {
  deviceId: number;
  modelName: string | null;
  brandName: string | null;
  seriesName: string | null;
  orderCount: number;
  totalFinalValue: number;
};

type TopShopQueryResult = {
  shopId: number | null;
  shopName: string | null;
  orderCount: number;
  totalFinalValue: number;
};

const alwaysFalseCondition = sql`1=0`; // Define it once

// Helper to build common conditions for queries
function buildBaseConditions(dateRange?: DateRange, shopIdInput?: number | { accessibleShopIds: number[] }): (SQL | undefined)[] {
  const conditions: (SQL | undefined)[] = [];

  if (typeof shopIdInput === 'number') {
    conditions.push(eq(orders.shop_id, shopIdInput));
  } else if (shopIdInput && typeof shopIdInput === 'object' && 'accessibleShopIds' in shopIdInput) {
    if (shopIdInput.accessibleShopIds.length > 0) {
      conditions.push(inArray(orders.shop_id, shopIdInput.accessibleShopIds));
    } else {
      conditions.push(alwaysFalseCondition); 
    }
  }
  // Note: If shopIdInput is undefined, no shop-specific filtering is applied from this parameter.

  if (dateRange?.dateFrom) {
    conditions.push(gte(orders.created_at, new Date(dateRange.dateFrom)));
  }
  if (dateRange?.dateTo) {
    const toDate = new Date(dateRange.dateTo);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(orders.created_at, toDate));
  }
  return conditions.filter(c => c !== undefined) as SQL[];
}

export class StatsRepository {
  async getTotalOrders(dateRange?: DateRange, shopIdInput?: number | { accessibleShopIds: number[] }): Promise<number> {
    const conditions = buildBaseConditions(dateRange, shopIdInput);
    const result = await db.select({ value: count() }).from(orders).where(conditions.length > 0 ? and(...conditions) : undefined);
    return result[0]?.value || 0;
  }

  async getOrdersByStatus(dateRange?: DateRange, shopIdInput?: number | { accessibleShopIds: number[] }): Promise<Record<OrderStatus, number>> {
    const conditions = buildBaseConditions(dateRange, shopIdInput);
    const result = await db
      .select({ status: orders.status, value: count() })
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(orders.status);

    const ordersByStatus = {} as Record<OrderStatus, number>;
    for (const key in ORDER_STATUS) {
      ordersByStatus[ORDER_STATUS[key as keyof typeof ORDER_STATUS]] = 0;
    }
    result.forEach(row => {
      if (row.status) {
        ordersByStatus[row.status as OrderStatus] = row.value;
      }
    });
    return ordersByStatus;
  }

  async getOrderValues(dateRange?: DateRange, shopIdInput?: number | { accessibleShopIds: number[] }): Promise<{
    totalEstimatedValue: number;
    totalFinalValue: number;
    totalCompletedOrdersForFinalValue: number;
  }> {
    const conditions = buildBaseConditions(dateRange, shopIdInput);
    
    const result = await db.select({
      totalEstimatedValue: sql<string>`COALESCE(SUM(${orders.estimated_price}), '0')`.mapWith(Number),
      totalFinalValue: sql<string>`COALESCE(SUM(${orders.final_price}), '0')`.mapWith(Number),
      totalCompletedOrdersForFinalValue: count(sql`CASE WHEN ${orders.status} = ${ORDER_STATUS.PAID} THEN 1 END`)
    })
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      totalEstimatedValue: result[0]?.totalEstimatedValue || 0,
      totalFinalValue: result[0]?.totalFinalValue || 0,
      totalCompletedOrdersForFinalValue: result[0]?.totalCompletedOrdersForFinalValue || 0
    };
  }

  async getPlatformOrderTimeSeries(dateRange: Required<DateRange>, period: 'daily' | 'weekly' | 'monthly', accessibleShopIds?: number[]) {
    if (accessibleShopIds && accessibleShopIds.length === 0) {
      return [];
    }

    const shopIdInput = accessibleShopIds ? { accessibleShopIds } : undefined;
    const conditions = buildBaseConditions(dateRange, shopIdInput);

    if (conditions.some(c => c === alwaysFalseCondition)) {
      return [];
    }

    let dateFormat: string;
    let dateGroupBy: SQL;
    
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        dateGroupBy = sql`DATE(${orders.created_at})`;
        break;
      case 'weekly':
        dateFormat = '%Y-%u';
        dateGroupBy = sql`YEARWEEK(${orders.created_at}, 1)`;
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        dateGroupBy = sql`DATE_FORMAT(${orders.created_at}, '%Y-%m')`;
        break;
      default:
        throw new Error(`Unsupported period: ${period}`);
    }

    const result = await db.select({
      period: sql<string>`DATE_FORMAT(${orders.created_at}, ${dateFormat})`,
      orderCount: count(orders.id),
      totalEstimatedValue: sql<number>`COALESCE(SUM(${orders.estimated_price}), 0)`.mapWith(Number),
      totalFinalValue: sql<number>`COALESCE(SUM(${orders.final_price}), 0)`.mapWith(Number),
      paidOrders: count(sql`CASE WHEN ${orders.status} = ${ORDER_STATUS.PAID} THEN 1 END`),
      pendingOrders: count(sql`CASE WHEN ${orders.status} = ${ORDER_STATUS.PENDING} THEN 1 END`),
      arrivedOrders: count(sql`CASE WHEN ${orders.status} = ${ORDER_STATUS.ARRIVED} THEN 1 END`),
      rejectedOrders: count(sql`CASE WHEN ${orders.status} = ${ORDER_STATUS.REJECTED} THEN 1 END`)
    })
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(dateGroupBy)
    .orderBy(sql`${dateGroupBy} ASC`);

    return result;
  }

  async getShopOrderTimeSeries(
    shopId: number,
    dateRange: Required<DateRange>,
    period: 'daily' | 'weekly' | 'monthly',
    accessibleShopIds?: number[]
  ) {
    if (accessibleShopIds && !accessibleShopIds.includes(shopId)) {
      return [];
    }

    const conditions = buildBaseConditions(dateRange, shopId);

    let dateFormat: string;
    let dateGroupBy: SQL;
    
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        dateGroupBy = sql`DATE(${orders.created_at})`;
        break;
      case 'weekly':
        dateFormat = '%Y-%u';
        dateGroupBy = sql`YEARWEEK(${orders.created_at}, 1)`;
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        dateGroupBy = sql`DATE_FORMAT(${orders.created_at}, '%Y-%m')`;
        break;
      default:
        throw new Error(`Unsupported period: ${period}`);
    }

    const result = await db.select({
      period: sql<string>`DATE_FORMAT(${orders.created_at}, ${dateFormat})`,
      orderCount: count(orders.id),
      totalEstimatedValue: sql<number>`COALESCE(SUM(${orders.estimated_price}), 0)`.mapWith(Number),
      totalFinalValue: sql<number>`COALESCE(SUM(${orders.final_price}), 0)`.mapWith(Number),
      paidOrders: count(sql`CASE WHEN ${orders.status} = ${ORDER_STATUS.PAID} THEN 1 END`),
      pendingOrders: count(sql`CASE WHEN ${orders.status} = ${ORDER_STATUS.PENDING} THEN 1 END`),
      arrivedOrders: count(sql`CASE WHEN ${orders.status} = ${ORDER_STATUS.ARRIVED} THEN 1 END`),
      rejectedOrders: count(sql`CASE WHEN ${orders.status} = ${ORDER_STATUS.REJECTED} THEN 1 END`)
    })
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(dateGroupBy)
    .orderBy(sql`${dateGroupBy} ASC`);

    return result;
  }

  async getPlatformTopDevices(
    limitVal: number,
    sortBy: "count" | "finalValue",
    dateRange?: DateRange,
    accessibleShopIds?: number[]
  ): Promise<TopDeviceQueryResult[]> {
    if (accessibleShopIds && accessibleShopIds.length === 0) {
      return [];
    }

    const shopIdInput = accessibleShopIds ? { accessibleShopIds } : undefined;
    const conditions = buildBaseConditions(dateRange, shopIdInput);
    conditions.push(isNotNull(orders.device_id));

    if (conditions.some(c => c === alwaysFalseCondition)) {
        return [];
    }

    const orderCountCol = count(orders.id).as("order_count");
    const totalFinalValueCol = sql<number>`COALESCE(SUM(${orders.final_price}), 0)`.mapWith(Number).as("total_final_value");

    const baseQuery = db.select({
      deviceId: orders.device_id,
      modelName: models.title,
      brandName: brands.title,
      seriesName: model_series.title,
      orderCount: orderCountCol,
      totalFinalValue: totalFinalValueCol
    })
    .from(orders)
    .leftJoin(models, eq(orders.device_id, models.id))
    .leftJoin(brands, eq(models.brand_id, brands.id))
    .leftJoin(model_series, eq(models.model_series_id, model_series.id))
    .where(and(...conditions))
    .groupBy(orders.device_id, models.title, brands.title, model_series.title);
    
    let finalQuery;
    if (sortBy === "count") {
      finalQuery = baseQuery.orderBy(desc(orderCountCol)).limit(limitVal);
    } else {
      finalQuery = baseQuery.orderBy(desc(totalFinalValueCol)).limit(limitVal);
    }
    
    const results = await finalQuery;
    return results as TopDeviceQueryResult[];
  }

  async getPlatformTopShops(
    limitVal: number,
    sortBy: "orderCount" | "totalFinalValue",
    dateRange?: DateRange,
    accessibleShopIds?: number[]
  ): Promise<TopShopQueryResult[]> {
    if (accessibleShopIds && accessibleShopIds.length === 0) {
      return []; // No shops accessible, so no top shops.
    }

    const shopIdInputForOrders = accessibleShopIds ? { accessibleShopIds } : undefined;
    const conditions = buildBaseConditions(dateRange, shopIdInputForOrders);
    conditions.push(isNotNull(orders.shop_id)); 
    conditions.push(isNotNull(shops.name)); // Ensure shop has a name

    // If buildBaseConditions determined no orders could be matched based on accessibleShopIds,
    // then no top shops can be generated from orders.
    if (conditions.some(c => c === alwaysFalseCondition)) {
        return [];
    }

    // Additionally, ensure that the shops themselves are filtered by accessibleShopIds if provided.
    // This is crucial for the LEFT JOIN to only consider shops the user can access.
    if (accessibleShopIds && accessibleShopIds.length > 0) {
      conditions.push(inArray(shops.id, accessibleShopIds));
    }

    const orderCountCol = count(orders.id).as("order_count");
    const totalFinalValueCol = sql<number>`COALESCE(SUM(${orders.final_price}), 0)`.mapWith(Number).as("total_final_value");

    const baseQuery = db.select({
      shopId: orders.shop_id,
      shopName: shops.name,
      orderCount: orderCountCol,
      totalFinalValue: totalFinalValueCol
    })
    .from(orders)
    .leftJoin(shops, eq(orders.shop_id, shops.id))
    .where(and(...conditions))
    .groupBy(orders.shop_id, shops.name);
    
    let finalQuery;
    if (sortBy === "orderCount") {
      finalQuery = baseQuery.orderBy(desc(orderCountCol)).limit(limitVal);
    } else {
      finalQuery = baseQuery.orderBy(desc(totalFinalValueCol)).limit(limitVal);
    }

    const results = await finalQuery;
    return results as TopShopQueryResult[];
  }

  async getShopOrderOverview(shopId: number, dateRange?: DateRange, accessibleShopIds?: number[]) {
    // Check if the requested shopId is in the list of accessibleShopIds
    if (accessibleShopIds && !accessibleShopIds.includes(shopId)) {
        return 0; // Or throw an error, or return a specific structure indicating no access
    }
    // If accessibleShopIds is undefined, it implies no restriction from this param, but service layer should ensure it's always passed for non-global views.
    return this.getTotalOrders(dateRange, shopId);
  }

  async getShopOrdersByStatus(shopId: number, dateRange?: DateRange, accessibleShopIds?: number[]) {
    if (accessibleShopIds && !accessibleShopIds.includes(shopId)) {
        return {} as Record<OrderStatus, number>; // No access
    }
    return this.getOrdersByStatus(dateRange, shopId);
  }

  async getShopOrderValues(shopId: number, dateRange?: DateRange, accessibleShopIds?: number[]) {
    if (accessibleShopIds && !accessibleShopIds.includes(shopId)) {
        return { totalEstimatedValue: 0, totalFinalValue: 0, totalCompletedOrdersForFinalValue: 0 }; // No access
    }
    return this.getOrderValues(dateRange, shopId);
  }
  
  async getShopTopDevices(
    shopId: number,
    limitVal: number,
    sortBy: "count" | "finalValue",
    dateRange?: DateRange,
    accessibleShopIds?: number[] // Added for consistency, though filtering is by shopId directly
  ): Promise<TopDeviceQueryResult[]> {
    // Primary security check: ensure the requested shopId is accessible.
    // The service layer should perform this check before calling the repository.
    // However, as a safeguard or if called directly:
    if (accessibleShopIds && !accessibleShopIds.includes(shopId)) {
        return []; // User does not have access to this specific shop's device stats
    }

    const conditions = buildBaseConditions(dateRange, shopId); // shopId here is the specific shop we are querying for
    conditions.push(isNotNull(orders.device_id));

    const orderCountCol = count(orders.id).as("order_count");
    const totalFinalValueCol = sql<number>`COALESCE(SUM(${orders.final_price}), 0)`.mapWith(Number).as("total_final_value");

    const baseQuery = db.select({
      deviceId: orders.device_id,
      modelName: models.title,
      brandName: brands.title,
      seriesName: model_series.title,
      orderCount: orderCountCol,
      totalFinalValue: totalFinalValueCol
    })
    .from(orders)
    .leftJoin(models, eq(orders.device_id, models.id))
    .leftJoin(brands, eq(models.brand_id, brands.id))
    .leftJoin(model_series, eq(models.model_series_id, model_series.id))
    .where(and(...conditions))
    .groupBy(orders.device_id, models.title, brands.title, model_series.title);
    
    let finalQuery;
    if (sortBy === "count") {
      finalQuery = baseQuery.orderBy(desc(orderCountCol)).limit(limitVal);
    } else {
      finalQuery = baseQuery.orderBy(desc(totalFinalValueCol)).limit(limitVal);
    }

    const results = await finalQuery;
    return results as TopDeviceQueryResult[];
  }

  // ======== Catalog / Publication Stats ========
  async getPublishedEntityCounts(shopId: number): Promise<{ categories: number; brands: number; series: number; models: number; featured: number }> {
    const [catRow] = await db.select({ value: count() }).from(shop_device_categories).where(eq(shop_device_categories.shop_id, shopId));
    const [brandRow] = await db.select({ value: count() }).from(shop_brands).where(eq(shop_brands.shop_id, shopId));
    const [seriesRow] = await db.select({ value: count() }).from(shop_model_series).where(eq(shop_model_series.shop_id, shopId));
    const [modelRow] = await db.select({ value: count() }).from(shop_models).where(and(eq(shop_models.shop_id, shopId), eq(shop_models.is_published, 1)));
    const [featuredRow] = await db.select({ value: count() }).from(featured_devices).where(eq(featured_devices.shopId, shopId));
    return {
      categories: catRow?.value ?? 0,
      brands: brandRow?.value ?? 0,
      series: seriesRow?.value ?? 0,
      models: modelRow?.value ?? 0,
      featured: featuredRow?.value ?? 0,
    };
  }

  async getUnpublishedModelCount(shopId: number): Promise<number> {
    const [row] = await db.select({ value: count() }).from(shop_models).where(and(eq(shop_models.shop_id, shopId), eq(shop_models.is_published, 0)));
    return row?.value ?? 0;
  }

  async getStockAndOrderQuickStats(shopId: number): Promise<{ stock: number; openOrders: number; completedOrdersThisMonth: number }> {
    // Stock devices count
    const [stockRow] = await db.select({ value: count() })
      .from(devices)
      .leftJoin(warehouses, eq(devices.warehouse_id, warehouses.id))
      .where(eq(warehouses.shop_id, shopId));

    // Open orders (pending + arrived)
    const [openOrderRow] = await db.select({ value: count() })
      .from(orders)
      .where(and(eq(orders.shop_id, shopId), inArray(orders.status, [ORDER_STATUS.PENDING, ORDER_STATUS.ARRIVED])));

    // Completed orders this month
    const [completedRow] = await db.select({ value: count() })
      .from(orders)
      .where(and(eq(orders.shop_id, shopId), eq(orders.status, ORDER_STATUS.PAID), sql`MONTH(${orders.created_at}) = MONTH(NOW()) AND YEAR(${orders.created_at}) = YEAR(NOW())`));

    return {
      stock: stockRow?.value ?? 0,
      openOrders: openOrderRow?.value ?? 0,
      completedOrdersThisMonth: completedRow?.value ?? 0,
    };
  }

  // Distribution counts for charts
  async getModelsPerCategory(shopId: number): Promise<Array<{ categoryId: number; categoryName: string; modelCount: number }>> {
    // Filter by the specific shop first to ensure we only count models published for that shop.
    const modelCountCol = count(shop_models.model_id).as('modelCount');

    const result = await db
      .select({
        categoryId: device_categories.id,
        categoryName: device_categories.title,
        modelCount: modelCountCol,
      })
      // Start from shopModels so that the base dataset is already restricted to the requested shop and published models.
      .from(shop_models)
      .leftJoin(models, eq(shop_models.model_id, models.id))
      .leftJoin(device_categories, eq(models.category_id, device_categories.id))
      .where(and(eq(shop_models.shop_id, shopId), eq(shop_models.is_published, 1)))
      .groupBy(device_categories.id, device_categories.title)
      .orderBy(desc(modelCountCol));

    return result as any;
  }

  async getModelsPerBrand(shopId: number): Promise<Array<{ brandId: number; brandName: string; modelCount: number }>> {
    const modelCountCol = count(shop_models.model_id).as('modelCount');

    const result = await db
      .select({
        brandId: brands.id,
        brandName: brands.title,
        modelCount: modelCountCol,
      })
      .from(shop_models)
      .leftJoin(models, eq(shop_models.model_id, models.id))
      .leftJoin(brands, eq(models.brand_id, brands.id))
      .where(and(eq(shop_models.shop_id, shopId), eq(shop_models.is_published, 1)))
      .groupBy(brands.id, brands.title)
      .orderBy(desc(modelCountCol));

    return result as any;
  }
}

export const statsRepository = new StatsRepository(); 