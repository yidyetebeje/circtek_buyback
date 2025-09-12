import { orderService } from "../services/orderService";
import { OrderStatus } from "../../db/order.schema";
import type { OrdersFilter, UpdateOrderStatusParams } from "../repository/orderRepository";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";
import type { Context } from 'elysia';
import { orderNotificationService } from "../../email/services/order-notification-service";


export class OrderController {
  /**
   * Create a new order
   */
  createOrder = async (context: Context) => {
    try {
      const { body } = context;
      console.log("body sent from the frontend", body)
      
      const {
        deviceId,
        deviceSnapshot,
        estimatedPrice,
        conditionAnswers,
        sellerAddress,
        sellerNotes,
        tenantId,
        shopId
      } = body as any; // Use 'as any' for now or define a proper type for body
      
      if (!deviceId || !estimatedPrice || !conditionAnswers || !sellerAddress || !shopId) {
        throw new BadRequestError("Missing required fields (deviceId, estimatedPrice, conditionAnswers, sellerAddress, tenantId, shopId)");
      }
      
      const result = await orderService.createOrder({
        deviceId,
        deviceSnapshot,
        estimatedPrice,
        conditionAnswers,
        sellerAddress,
        sellerNotes,
        shopId 
      });
      
      // Send order confirmation email
      try {
        // Send notification asynchronously - don't await
        orderNotificationService.sendOrderStatusNotification(
          result.id, 
          result.status, 
          shopId
        ).then(emailResult => {
          if (!emailResult.success) {
            console.error(`[OrderController] Failed to send order confirmation email for order ${result.id}: ${emailResult.error}`);
          }
        }).catch(error => {
          console.error(`[OrderController] Error sending order confirmation email for order ${result.id}:`, error);
        });
      } catch (emailError) {
        // Don't block the API response if email fails
        console.error(`[OrderController] Error preparing order confirmation email for order ${result.id}:`, emailError);
      }
      
      context.set.status = 201;
      return {
        data: {
            orderId: result.id,
            orderNumber: result.orderNumber,
            status: result.status,
            shippingLabelUrl: result.shippingDetails?.shippingLabelUrl,
        },
        message: "Order created successfully. Please check your email for shipping instructions."
      };
    } catch (error: any) {
      console.error("[OrderController] Create order error:", error);
      if (error instanceof BadRequestError) {
        context.set.status = 400;
        return { error: error.message };
      }
      context.set.status = 500;
      return { error: error.message || "An error occurred while creating the order" };
    }
  }
  
  /**
   * Create a new order as an Admin/ShopManager
   * Uses warehouse pattern for role management
   */
  createAdminOrder = async (context: Context) => {
    try {
      const { body, currentRole, currentTenantId, currentUserId, warehouseId} = context as any;

      if (!currentUserId) {
        throw new ForbiddenError("Authentication required");
      }

      // Determine effective tenant ID based on user role (following warehouse pattern)
      let effectiveTenantId: number | undefined;
      const isPrivileged = currentRole === 'super_admin' || currentRole === 'admin';
      
      effectiveTenantId = currentTenantId;

      // Handle warehouse restrictions for non-privileged users
      if (!isPrivileged && warehouseId && warehouseId !== 0) {
        if (body.warehouseId && body.warehouseId !== warehouseId) {
          throw new ForbiddenError('Forbidden: You are restricted to your assigned warehouse.');
        }
        // Force warehouseId to user's warehouse
        body.warehouseId = warehouseId;
      }

      const result = await orderService.createAdminOrder({
        ...body,
        tenantId: effectiveTenantId
      }, currentUserId);

      context.set.status = 201;
      return {
        data: {
            orderId: result.id,
            orderNumber: result.orderNumber,
            status: result.status,
        },
        message: "Admin order created successfully."
      };
    } catch (error: any) {
      console.error("[OrderController] Create admin order error:", error);
      if (error instanceof BadRequestError) {
        context.set.status = 400;
        return { error: error.message };
      }
      if (error instanceof ForbiddenError) {
        context.set.status = 403;
        return { error: error.message };
      }
      context.set.status = 500;
      return { error: error.message || "An error occurred while creating the admin order" };
    }
  }
  
  /**
   * Get an order by ID
   * Uses warehouse pattern for access control
   */
  getOrderById = async (context: Context) => {
    try {
      const { params, currentRole, currentTenantId, currentUserId, warehouseId } = context as any;
      const { orderId } = params as { orderId: string };
      
      // Create user object for service call
      const user = currentUserId ? {
        id: currentUserId,
        tenant_id: currentTenantId,
        roleSlug: currentRole,
        warehouseId: warehouseId,
        managed_shop_id: warehouseId,
        email: ''
      } : undefined;
      
      const order = await orderService.getOrderById(orderId, user);
      
      if (!order) {
        throw new NotFoundError("Order not found or you don't have access to it");
      }
      
      return { data: order };
    } catch (error: any) {
      console.error("[OrderController] Get order error:", error);
      if (error instanceof NotFoundError) {
        context.set.status = 404;
        return { error: error.message };
      }
      if (error instanceof BadRequestError) { 
        context.set.status = 400;
        return { error: error.message };
      }
      context.set.status = 500;
      return { error: error.message || "An error occurred while retrieving the order" };
    }
  }
  
  /**
   * List orders with filtering based on user role
   * Uses warehouse pattern for role-based access control
   */
  listOrders = async (context: Context) => {
    try {
      const { query, currentRole, currentTenantId, currentUserId, warehouseId } = context as any;

      const {
        status,
        dateFrom,
        dateTo,
        page = "1",
        limit = "20",
        sortBy = "createdAt",
        sortOrder = "desc",
        shopId,
        search,
        tenantId: queryTenantId // Rename to avoid confusion
      } = query as any;
      
      // Parse and validate query params
      const parsedPage = parseInt(page as string, 10);
      const parsedLimit = parseInt(limit as string, 10);
      const parsedShopId = shopId ? parseInt(shopId as string, 10) : undefined;
      const parsedQueryTenantId = queryTenantId ? parseInt(queryTenantId as string, 10) : undefined;

      if (isNaN(parsedPage) || parsedPage < 1) throw new BadRequestError('Invalid page number.');
      if (isNaN(parsedLimit) || parsedLimit < 1) throw new BadRequestError('Invalid limit value.');
      if (parsedShopId !== undefined && isNaN(parsedShopId)) throw new BadRequestError('Invalid shop ID.');
      if (parsedQueryTenantId !== undefined && isNaN(parsedQueryTenantId)) throw new BadRequestError('Invalid tenant ID.');

      // Determine effective tenant ID based on user role (following warehouse pattern)
      let effectiveTenantId: number | undefined;
      const isAdmin = currentRole === 'admin' || currentRole === 'super-admin';
      
      if (isAdmin && parsedQueryTenantId) {
        // Admin can filter by specific tenant ID
        effectiveTenantId = parsedQueryTenantId;
      } else if (currentRole) {
        // Non-admin users use their own tenant ID
        effectiveTenantId = currentTenantId;
      }

      const filter: OrdersFilter = {
        status: status as OrderStatus | undefined,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        tenantId: effectiveTenantId,
        shopId: parsedShopId,
        search: search as string | undefined,
        page: parsedPage,
        limit: parsedLimit,
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc"
      };

      // Create user object for service call
      const user = currentUserId ? {
        id: currentUserId,
        tenant_id: currentTenantId,
        roleSlug: currentRole,
        warehouseId: warehouseId,
        managed_shop_id: warehouseId,
        email: ''
      } : undefined;
      
      const result = await orderService.listOrders(filter, user);
      return { data: result };
    } catch (error: any) {
      console.error("[OrderController] List orders error:", error);
       if (error instanceof BadRequestError) {
        context.set.status = 400;
        return { error: error.message };
      }
      context.set.status = 500;
      return { error: error.message || "An error occurred while retrieving orders" };
    }
  }
  
  /**
   * Update order status (admin or shop manager)
   * Uses simplified role checking following warehouse pattern
   */
  updateOrderStatus = async (context: Context) => {
    try {
      const { params, body, currentUserId, currentRole, currentTenantId, currentWarehouseId } = context as any; 
      
      const { orderId } = params as { orderId: string };
      
      if (!currentUserId) {
        throw new ForbiddenError("Authentication required");
      }

      // Simplified role check (following warehouse pattern)
      const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';
      const isClient = currentRole === 'client';
      const isShopManager = currentRole === 'shop_manager';
      
      if (!isAdmin && !isShopManager && !isClient) {
        throw new ForbiddenError("Admin or Shop Manager permissions required");
      }

      // For shop managers, ensure they have a managed shop
      if (isShopManager && (!currentWarehouseId || currentWarehouseId === null)) {
        console.error(`Shop manager ${currentUserId} (${currentRole}) has no managed_shop_id assigned.`);
        throw new ForbiddenError("Shop manager configuration error: No managed shop ID assigned.");
      }
      
      const { newStatus, adminNotes, finalPrice, imei, sku, warehouseId } = body as any;
      if (!newStatus) {
        throw new BadRequestError("New status is required");
      }

      // For PAID status, ensure all required fields are provided
      if (newStatus === 'PAID' && (!finalPrice || !imei || !sku || !warehouseId)) {
        throw new BadRequestError("Final price, IMEI, SKU, and Warehouse ID are required for PAID status");
      }
      
      // Create user object for service call
      const user = {
        id: currentUserId,
        tenant_id: currentTenantId,
        roleSlug: currentRole,
        warehouseId: currentWarehouseId,
        managed_shop_id: currentWarehouseId,
        email: ''
      };
      
      const updatedOrder = await orderService.updateOrderStatus({
        orderId,
        newStatus: newStatus as OrderStatus,
        changedByUserId: currentUserId,
        notes: adminNotes,
        finalPrice,
        imei,
        sku,
        warehouseId
      }, user);
      
      // Send email notification for status change
      try {
        const shopId = updatedOrder?.shop_id;
        if (shopId) {
          // Send notification asynchronously - don't await
          orderNotificationService.sendOrderStatusNotification(
            orderId, 
            newStatus as OrderStatus, 
            shopId
          ).then(result => {
            if (!result.success) {
              console.error(`[OrderController] Failed to send notification email for order ${orderId}: ${result.error}`);
            }
          }).catch(error => {
            console.error(`[OrderController] Error sending notification email for order ${orderId}:`, error);
          });
        } else {
          console.error(`[OrderController] Cannot send notification email - missing shop ID for order ${orderId}`);
        }
      } catch (emailError) {
        // Don't block the API response if email fails
        console.error(`[OrderController] Error preparing notification email for order ${orderId}:`, emailError);
      }
      
      return {
        data: updatedOrder,
        message: `Order status updated to ${newStatus}`
      };
    } catch (error: any) {
      console.error("[OrderController] Update order status error:", error);
      if (error instanceof ForbiddenError) {
        context.set.status = 403;
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        context.set.status = 404;
        return { error: error.message };
      }
      if (error instanceof BadRequestError) {
        context.set.status = 400;
        return { error: error.message };
      }
      context.set.status = 500;
      return { error: error.message || "An error occurred while updating the order status" };
    }
  }

  /**
   * Check if a device (by IMEI or serial number) is eligible for purchase.
   * Returns { purchasable: boolean; reason?: string }
   */
  checkDeviceEligibility = async (context: Context) => {
    try {
      const { query } = context as any;
      const { currentUserId, currentTenantId } = context as any;
      if(!currentUserId) {
        throw new ForbiddenError("Authentication required");
      }
      const tenantId = currentTenantId;
      const { imei, serial } = query as { imei?: string; serial?: string };

      const result = await orderService.checkDeviceEligibility({ imei, serialNumber: serial, tenant_id: tenantId });
      return { data: result };
    } catch (error: any) {
      console.error("[OrderController] checkDeviceEligibility error:", error);
      context.set.status = 400;
      return { error: error.message || "Unable to check device eligibility" };
    }
  }
}

// Export a singleton instance
export const orderController = new OrderController(); 