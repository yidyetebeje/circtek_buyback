import { and, eq, desc, asc, gte, lte, like, inArray, sql, or, count } from "drizzle-orm";
import { db } from "../../db";

import { orders, order_status_history, order_device_condition_answers, shipping_details, OrderStatus } from "../../db/order.schema";
import { shops } from "../../db/shops.schema";
import { users } from "../../db/circtek.schema";
import { models } from "../../db/buyback_catalogue.schema";
// Note: Drizzle migrations will handle the actual creation of UUIDs
// We use string IDs that look like UUIDs in this implementation for compatibility 

export type CreateOrderParams = {
  deviceId: number;
  deviceSnapshot: any;
  estimatedPrice: number;
  conditionAnswers: Array<{
    questionKey: string;
    questionTextSnapshot: string;
    answerValue: any;
    answerTextSnapshot?: string;
  }>;
  sellerAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    countryCode: string;
    phoneNumber?: string;
    email?: string;
  };
  sellerNotes?: string;
 
  shopId: number;
};

export type CreateAdminOrderParams = CreateOrderParams & {
  status: OrderStatus;
  finalPrice?: number;
  imei?: string;
  sku?: string;
  serialNumber?: string;
  testingInfo?: any;
};

export type UpdateOrderStatusParams = {
  orderId: string;
  newStatus: OrderStatus;
  changedByUserId?: number;
  notes?: string;
  finalPrice?: number;
  imei?: string;
  // Device creation parameters for PAID status
  sku?: string;
  warehouseId?: number;
};

export type OrdersFilter = {
  status?: OrderStatus | OrderStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  tenantId?: number;
  shopId?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  allowedShopIds?: number[];
};

// Generate a unique order number
const generateOrderNumber = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  
  // Get count of orders for today to generate sequential number
  const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  
  const result = await db.select({ count: count() })
    .from(orders)
    .where(and(
      gte(orders.created_at, todayStart),
      lte(orders.created_at, todayEnd)
    ));
  
  const todayCount = (result[0]?.count || 0) + 1;
  const sequence = todayCount.toString().padStart(4, "0");
  
  return `ORD-${year}${month}${day}-${sequence}`;
};

// Generate a simple ID for use in tests and prototyping
// In production, use a proper UUID library or let the database generate IDs
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

export const orderRepository = {
  // Create a new order with all related records in a transaction
  createOrder: async (params: CreateOrderParams) => {
    const { 
      deviceId, 
      deviceSnapshot, 
      estimatedPrice, 
      conditionAnswers,
      sellerAddress,
      sellerNotes,
      
      shopId
    } = params;
    const shop = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
    if(!shop || shop.length == 0){
      throw new Error("Shop not found");
    }
    const tenant_id = shop[0].tenant_id;
    return await db.transaction(async (tx) => {
      const orderId = generateId();
      const orderNumber = await generateOrderNumber();
      await tx.insert(orders).values({
        id: orderId,
        order_number: orderNumber,
        device_id: deviceId,
        device_snapshot: deviceSnapshot,
        estimated_price: String(estimatedPrice),
        status: "PENDING",
        seller_notes: sellerNotes || null,
        tenant_id: tenant_id,
        shop_id: shopId,
        created_at: new Date(),
        updated_at: new Date()
      });
      const newOrder = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).then(rows => rows[0]);
      for (const answer of conditionAnswers) {
        await tx.insert(order_device_condition_answers).values({
          id: generateId(),
          order_id: orderId,
          question_key: answer.questionKey,
          question_text_snapshot: answer.questionTextSnapshot,
          answer_value: answer.answerValue,
          answer_text_snapshot: answer.answerTextSnapshot || null,
          created_at: new Date()
        });
      }
      
      // Insert shipping details
      await tx.insert(shipping_details).values({
        id: generateId(),
        orderId: orderId,
        sellerName: sellerAddress.name,
        seller_street1: sellerAddress.street1,
        seller_street2: sellerAddress.street2 || null,
        seller_city: sellerAddress.city,
        seller_state_province: sellerAddress.stateProvince,
        seller_postal_code: sellerAddress.postalCode,
        seller_country_code: sellerAddress.countryCode,
        seller_phone_number: sellerAddress.phoneNumber || null,
        seller_email: sellerAddress.email || null,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Get shipping details
      const newShippingDetails = await tx.select().from(shipping_details)
        .where(eq(shipping_details.orderId, orderId))
        .limit(1)
        .then(rows => rows[0]);
      
      // Insert initial status history
      await tx.insert(order_status_history).values({
        id: generateId(),
        order_id: orderId,
        status: "PENDING",
        changed_at: new Date(),
        notes: "Order created"
      });
      
      return { ...newOrder, shippingDetails: newShippingDetails };
    });
  },
  
  // Create a new order as an Admin
  createAdminOrder: async (params: CreateAdminOrderParams, adminUserId: number) => {
    const { 
      deviceId, 
      deviceSnapshot, 
      estimatedPrice,
      finalPrice,
      conditionAnswers,
      sellerAddress,
      sellerNotes,
      
      shopId,
      status,
      imei,
      sku,
      serialNumber,
      testingInfo
    } = params;

    return await db.transaction(async (tx) => {
      const orderId = generateId();
      const orderNumber = await generateOrderNumber();
      
      const shop = await tx.select().from(shops).where(eq(shops.id, shopId)).limit(1);
      if(!shop || shop.length == 0){
        throw new Error("Shop not found");
      }
      const tenant_id = shop[0].tenant_id;

      await tx.insert(orders).values({
        id: orderId,
        order_number: orderNumber,
        device_id: deviceId,
        device_snapshot: deviceSnapshot,
        estimated_price: String(estimatedPrice),
        final_price: finalPrice !== undefined ? String(finalPrice) : undefined,
        status: status || "PENDING",
        imei: imei || null,
        sku: sku || null,
        seller_notes: sellerNotes || null,
        tenant_id: tenant_id,
        shop_id: shopId,
        serial_number: serialNumber || null,
        testing_info: testingInfo || null,
        created_at: new Date(),
        updated_at: new Date()
      });

      const newOrder = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).then(rows => rows[0]);
      
      for (const answer of conditionAnswers) {
        await tx.insert(order_device_condition_answers).values({
          id: generateId(),
          order_id: orderId,
          question_key: answer.questionKey,
          question_text_snapshot: answer.questionTextSnapshot,
          answer_value: answer.answerValue,
          answer_text_snapshot: answer.answerTextSnapshot || null,
          created_at: new Date()
        });
      }
      
      await tx.insert(shipping_details).values({
        id: generateId(),
        orderId: orderId,
        sellerName: sellerAddress.name,
        seller_street1: sellerAddress.street1,
        seller_street2: sellerAddress.street2 || null,
        seller_city: sellerAddress.city,
        seller_state_province: sellerAddress.stateProvince,
        seller_postal_code: sellerAddress.postalCode,
        seller_country_code: sellerAddress.countryCode,
        seller_phone_number: sellerAddress.phoneNumber || null,
        seller_email: sellerAddress.email || null,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      await tx.insert(order_status_history).values({
        id: generateId(),
        order_id: orderId,
        status: status || "PENDING",
        changed_at: new Date(),
        notes: "Order created by admin.",
        changed_by_user_id: adminUserId
      });
      
      return newOrder;
    });
  },
  
  // Get a single order with all related data
  getOrderById: async (orderId: string, allowedShopIds?: number[]) => {
    // Get the order record
    const orderResults = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    
    if (!orderResults.length) {
      return null;
    }
    
    const order = orderResults[0];
    
    // Check if the user has access to this order's shop
    if (allowedShopIds && !allowedShopIds.includes(order.shop_id)) {
      return null; // User doesn't have access to this order
    }
    
    // Continue with normal order retrieval
    const deviceResults = await db.select().from(models).where(eq(models.id, order.device_id)).limit(1);
    const device = deviceResults.length ? deviceResults[0] : null;
    
    const conditionAnswers = await db
      .select()
      .from(order_device_condition_answers)
      .where(eq(order_device_condition_answers.order_id, orderId));
    
    const shipping = await db
      .select()
      .from(shipping_details)
      .where(eq(shipping_details.orderId, orderId))
      .limit(1);
    
    const statusHistory = await db
      .select({
        id: order_status_history.id,
        status: order_status_history.status,
        changed_at: order_status_history.changed_at,
        changed_by_user_id: order_status_history.changed_by_user_id,
        notes: order_status_history.notes
      })
      .from(order_status_history)
      .where(eq(order_status_history.order_id, orderId))
      .orderBy(desc(order_status_history.changed_at));
    
    // Get user names for status history
    const adminUserIds = statusHistory.map(history => history.changed_by_user_id).filter(id => id !== null) as number[];
    const adminUserNames = adminUserIds.length ? await db
      .select({
        id: users.id,
        fullName: users.name
      })
      .from(users)
      .where(inArray(users.id, adminUserIds)) : [];
    
    const adminUserNameMap = new Map(adminUserNames.map(u => [u.id, u.fullName]));
    
    const statusHistoryWithNames = statusHistory.map(history => ({
      ...history,
      changedByUserName: history.changed_by_user_id ? adminUserNameMap.get(history.changed_by_user_id) : null
    }));
    
    return {
      ...order,
      device,
      conditionAnswers,
      shipping: shipping[0] || null,
      statusHistory: statusHistoryWithNames
    };
  },
  
  // List orders with filtering and pagination
  listOrders: async (filters: OrdersFilter = {}) => {
    const {
      status,
      dateFrom,
      dateTo,
      tenantId,
      shopId,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      allowedShopIds
    } = filters;
    
    // Build the WHERE conditions
    const whereConditions = [];
    
    if (status) {
      if (Array.isArray(status)) {
        whereConditions.push(inArray(orders.status, status));
      } else {
        whereConditions.push(eq(orders.status, status));
      }
    }
    
    if (dateFrom) {
      whereConditions.push(gte(orders.created_at, dateFrom));
    }
    
    if (dateTo) {
      whereConditions.push(lte(orders.created_at, dateTo));
    }
    
    if (tenantId) {
      whereConditions.push(eq(orders.tenant_id, tenantId));
    }
    
    if (shopId) {
      whereConditions.push(eq(orders.shop_id, shopId));
    }
    
    // Shop access restriction: if allowedShopIds is provided, limit to only those shops
    if (allowedShopIds) {
      if (allowedShopIds.length === 0) {
        // If user has no accessible shops, return empty result
        return {
          orders: [],
          pagination: {
            page,
            limit,
            totalCount: 0,
            totalPages: 0
          }
        };
      }
      
      whereConditions.push(inArray(orders.shop_id, allowedShopIds));
    }
    
    if (search) {
      whereConditions.push(
        or(
          like(orders.order_number, `%${search}%`),
          sql`JSON_EXTRACT(${orders.device_snapshot}, '$.modelName') LIKE ${`%${search}%`}`
        )
      );
    }
    
    // Calculate pagination values
    const offset = (page - 1) * limit;
    
    // Execute count query for pagination metadata
    let countQuery = db
      .select({ count: count() })
      .from(orders)
      .leftJoin(shops, eq(orders.shop_id, shops.id));
      
    if (whereConditions.length > 0) {
      countQuery = countQuery.where(and(...whereConditions)) as typeof countQuery;
    }
    
    const [countResult] = await countQuery;
    const totalCount = countResult?.count || 0;
    
    // Execute the main query
    let mainQuery = db
      .select({
        id: orders.id,
        order_number: orders.order_number,
        device_id: orders.device_id,
        device_snapshot: orders.device_snapshot,
        estimated_price: orders.estimated_price,
        final_price: orders.final_price,
        status: orders.status,
        created_at: orders.created_at,
        updated_at: orders.updated_at,
        shop: {
          id: shops.id,
          name: shops.name,
          organization: shops.organization,
          phone: shops.phone,
          logo: shops.logo,
          active: shops.active
        }
      })
      .from(orders)
      .leftJoin(shops, eq(orders.shop_id, shops.id));
      
    if (whereConditions.length > 0) {
      mainQuery = mainQuery.where(and(...whereConditions)) as typeof mainQuery;
    }
    
    // Apply sorting
    if (sortBy === "createdAt") {
      mainQuery = mainQuery.orderBy(sortOrder === "asc" ? asc(orders.created_at) : desc(orders.created_at)) as typeof mainQuery;
    } else if (sortBy === "updatedAt") {
      mainQuery = mainQuery.orderBy(sortOrder === "asc" ? asc(orders.updated_at) : desc(orders.updated_at)) as typeof mainQuery;
    } else if (sortBy === "orderNumber") {
      mainQuery = mainQuery.orderBy(sortOrder === "asc" ? asc(orders.order_number) : desc(orders.order_number)) as typeof mainQuery;
    } else if (sortBy === "estimatedPrice") {
      mainQuery = mainQuery.orderBy(sortOrder === "asc" ? asc(orders.estimated_price) : desc(orders.estimated_price)) as typeof mainQuery;
    }
    
    // Apply pagination
    mainQuery = mainQuery.limit(limit).offset(offset) as typeof mainQuery;
    
    const results = await mainQuery;
    
    return {
      orders: results,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  },
  
  // Update order status
  updateOrderStatus: async (params: UpdateOrderStatusParams & { serialNumber?: string; notes?: string }) => {
    const { orderId, newStatus, changedByUserId, notes, finalPrice, imei, sku, warehouseId, serialNumber } = params;
    
    return await db.transaction(async (tx) => {
      // Update the order status
      await tx
        .update(orders)
        .set({
          status: newStatus,
          final_price: finalPrice !== undefined ? String(finalPrice) : undefined,
          imei: imei || undefined,
          sku: sku || undefined,
          serial_number: serialNumber || undefined,
          admin_notes: notes || undefined,
          updated_at: new Date()
        })
        .where(eq(orders.id, orderId));
      
      // Get the updated order
      const updatedOrders = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      
      if (!updatedOrders.length) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      
      // Add status history record
      await tx.insert(order_status_history).values({
        id: generateId(),
        order_id: orderId,
        status: newStatus,
        changed_at: new Date(),
        changed_by_user_id: changedByUserId ?? null,
        notes: notes || null
      });
      
      return updatedOrders[0];
    });
  },
  
  // Get shipping details for an order
  getShippingDetails: async (orderId: string) => {
    const shipping = await db
      .select()
      .from(shipping_details)
      .where(eq(shipping_details.orderId, orderId))
      .limit(1);
    
    return shipping[0] || null;
  },
  
  // Update shipping details
  updateShippingDetails: async (
    orderId: string, 
    data: {
      shipping_label_url?: string;
      tracking_number?: string;
      shipping_provider?: string;
      label_data?: any;
    }
  ) => {
    await db
      .update(shipping_details)
      .set({
        ...data,
        updated_at: new Date()
      })
      .where(eq(shipping_details.orderId, orderId));
    
    // Return the updated record
    const updated = await db
      .select()
      .from(shipping_details)
      .where(eq(shipping_details.orderId, orderId))
      .limit(1);
    
    return updated[0] || null;
  },
  
  /**
   * Find an order with status PAID that matches a given IMEI or serial number.
   * Used to prevent purchasing a device that has already been bought.
   */
  findPaidOrderByIdentifier: async (
    params: { imei?: string; serialNumber?: string }
  ) => {
    const { imei, serialNumber } = params;

    // At least one identifier must be provided
    if (!imei && !serialNumber) {
      throw new Error("IMEI or serialNumber must be provided");
    }

    // Build dynamic where conditions
    const conditions: any[] = [eq(orders.status, "PAID")];

    if (imei) {
      conditions.push(eq(orders.imei, imei));
    }

    if (serialNumber) {
      conditions.push(eq(orders.serial_number, serialNumber));
    }

    const result = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .limit(1);

    return result.length ? result[0] : null;
  },
}; 