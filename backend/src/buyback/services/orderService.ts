import { orderRepository, CreateOrderParams, UpdateOrderStatusParams, OrdersFilter } from "../repository/orderRepository";
import { shippingService } from "./shippingService";
import { notificationService } from "./notificationService";
import { ORDER_STATUS, OrderStatus } from "../../db/order.schema";
import { getAllowedShopIds } from "../../utils/access-control-buyback";
import { deviceService } from "../../services/deviceService";

interface JwtUser {
  id: number;
  tenant_id: number;
  roleSlug: string;
  warehouseId?: number;
  managed_shop_id?: number;
  email: string;
}


/**
 * Order service - orchestrates the creation and management of orders
 * using the repository, shipping service, and notification service
 * Following warehouse pattern for role management
 */
export class OrderService {
  /**
   * Create a new order with all associated data
   * @param params Order creation parameters
   * @returns The created order object
   */
  async createOrder(params: CreateOrderParams): Promise<any> {
    try {
      // Create the order record and associated data
      const newOrder = await orderRepository.createOrder(params);
      
      // Extract device name from snapshot for notifications
      const deviceName = (newOrder.device_snapshot as any)?.modelName || "Device";

      // Async operations (fire and forget for now, consider a job queue for production)
      this.generateShippingLabel(newOrder.id, params.sellerAddress).catch(err => console.error("Shipping label generation failed:", err));
      this.sendConfirmationEmails(
        newOrder.id,
        params.sellerAddress.email,
        {
          orderNumber: newOrder.order_number,
          deviceName,
          customerName: params.sellerAddress.name,
          estimatedPrice: Number(newOrder.estimated_price)
        }
      ).catch(err => console.error("Confirmation email sending failed:", err));
      
      return {
        ...newOrder,
      };
    } catch (error) {
      console.error("[OrderService] Error creating order:", error);
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Create a new order as an admin, with status and inventory handling.
   * @param params Order creation parameters from an admin
   * @param adminUserId The ID of the admin creating the order
   * @returns The created order object
   */
  async createAdminOrder(params: any, adminUserId: number): Promise<any> {
    try {
      // Admin creation can specify status. Default to PENDING if not provided.
      const status = params.status || ORDER_STATUS.PENDING;

      // If creating a PAID order, validate required fields
      if (status === ORDER_STATUS.PAID) {
        if (!params.imei || !params.sku || !params.warehouseId || !params.finalPrice) {
          throw new Error(`IMEI, SKU, warehouse ID, and final price are required when creating an order as PAID`);
        }
      }

      // Create the order record and associated data
      const newOrder = await orderRepository.createAdminOrder({ ...params, status }, adminUserId);
      
      // If status is PAID, create device in inventory
      if (newOrder.status === ORDER_STATUS.PAID) {
        try {
          await deviceService.addDevice({
            imei: params.imei,
            sku: params.sku,
            serial: params.serialNumber,
            warehouse_id: params.warehouseId, 
            tenant_id: newOrder.tenant_id,
            order_id: Number(newOrder.id)
          });
          console.log(`[OrderService] Device with IMEI ${params.imei} added to inventory from admin order ${newOrder.id}`);
        } catch (deviceError) {
          // Log the error but don't fail the whole transaction for now
          console.error(`[OrderService] Error adding device to inventory for admin order:`, deviceError);
        }
      }

      return newOrder;
    } catch (error) {
      console.error("[OrderService] Error creating admin order:", error);
      throw new Error(`Failed to create admin order: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get an order by ID with all related data
   * Uses warehouse pattern for access control
   * @param orderId The order ID
   * @param user Optional user to check access permissions
   * @returns The complete order object or null if not found or no access
   */
  async getOrderById(orderId: string, user?: JwtUser): Promise<any> {
    try {
      let allowedShopIds: number[] | undefined;
      if (user) {
        allowedShopIds = await getAllowedShopIds(user.id, user.roleSlug, user.managed_shop_id);
      }
      return await orderRepository.getOrderById(orderId, allowedShopIds);
    } catch (error) {
      console.error(`[OrderService] Error getting order ${orderId}:`, error);
      throw new Error(`Failed to get order: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * List orders with filtering and pagination
   * Uses warehouse pattern for role-based access control
   * @param filters Optional filter criteria
   * @param user Optional user to check access permissions
   * @returns Paginated list of orders
   */
  async listOrders(filters: OrdersFilter = {}, user?: JwtUser): Promise<any> {
    try {
      if (user) {
        const allowedShopIds = await getAllowedShopIds(user.id, user.roleSlug, user.managed_shop_id);
        filters.allowedShopIds = allowedShopIds;
      }
      return await orderRepository.listOrders(filters);
    } catch (error) {
      console.error("[OrderService] Error listing orders:", error);
      throw new Error(`Failed to list orders: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update the status of an order
   * Uses warehouse pattern for access control
   * @param params Update parameters including new status
   * @param user User to check access permissions
   * @returns The updated order
   */
  async updateOrderStatus(params: UpdateOrderStatusParams & { serialNumber?: string }, user: JwtUser): Promise<any> {
    try {
      // Get the shops the user has access to (following warehouse pattern)
      const allowedShopIds = await getAllowedShopIds(user.id, user.roleSlug, user.managed_shop_id);
      
      // Get the current order to compare status changes
      const currentOrder = await orderRepository.getOrderById(params.orderId, allowedShopIds);
      if (!currentOrder) {
        throw new Error(`Order with ID ${params.orderId} not found or you don't have access to it`);
      }

      // Validate required fields for PAID status
      if (
        params.newStatus === ORDER_STATUS.PAID &&
        (!params.imei || !params.sku || !params.warehouseId || !params.finalPrice)
      ) {
        throw new Error(`IMEI, SKU, warehouse ID, and final price are required when marking an order as PAID`);
      }

      // Update the order status
      const updatedOrder = await orderRepository.updateOrderStatus(params);
      
      // If status changed to PAID, create device in inventory
      if (
        params.newStatus === ORDER_STATUS.PAID &&
        params.imei && params.sku && params.warehouseId
      ) {
        try {
          // Add the device to inventory
          await deviceService.addDevice({
            imei: params.imei,
            sku: params.sku,
            serial: params.serialNumber,
            warehouse_id: params.warehouseId,
            tenant_id: currentOrder.tenant_id,
            order_id: Number(params.orderId)
          });
          
          console.log(`[OrderService] Device with IMEI ${params.imei} added to inventory from order ${params.orderId}`);
        } catch (deviceError) {
          // Log the error but don't fail the whole transaction
          console.error(`[OrderService] Error adding device to inventory:`, deviceError);
        }
      }
      
      // If status has changed, send notifications
      if (currentOrder.status !== params.newStatus) {
        this.sendStatusUpdateNotification(
          updatedOrder.id,
          params.newStatus,
          currentOrder.shipping?.seller_email ?? undefined,
          {
            orderNumber: updatedOrder.order_number,
            deviceName: (updatedOrder.device_snapshot as any)?.modelName || "Device",
            finalPrice: params.finalPrice
          }
        ).catch(err => console.error("Status update email sending failed:", err));
      }
      
      return updatedOrder;
    } catch (error) {
      console.error(`[OrderService] Error updating order status:`, error);
      throw new Error(`Failed to update order status: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Check if a user has access to an order
   * Uses warehouse pattern for access control
   * @param user The user
   * @param orderId The order ID
   * @returns True if the user has access, false otherwise
   */
  async hasOrderAccess(user: JwtUser, orderId: string): Promise<boolean> {
    try {
      // Get the order to check its shop ID
      const order = await orderRepository.getOrderById(orderId);
      if (!order) {
        return false;
      }
      
      // Check if the user has access to the order's shop using getAllowedShopIds
      const allowedShopIds = await getAllowedShopIds(user.id, user.roleSlug, user.managed_shop_id);
      if (!allowedShopIds) {
        // undefined means no restrictions (admin/client roles)
        return true;
      }
      
      return allowedShopIds.includes(order.shop_id);
    } catch (error) {
      console.error(`[OrderService] Error checking order access:`, error);
      return false;
    }
  }

  /**
   * Generate a shipping label for an order
   * @param orderId The order ID
   * @param sellerAddress The seller's address
   * @returns Results of the shipping label generation
   */
  private async generateShippingLabel(
    orderId: string,
    sellerAddress: CreateOrderParams["sellerAddress"]
  ): Promise<void> {
    try {
      // Generate the label
      const labelInfo = await shippingService.generateAndSaveShippingLabel(orderId, sellerAddress);
      
      console.log(`[OrderService] Shipping label generated for order ${orderId}:`, labelInfo.trackingNumber);
      
      // If needed, we could update the order or send an additional notification here
    } catch (error) {
      console.error(`[OrderService] Error generating shipping label for order ${orderId}:`, error);
      // Log and potentially add to a retry queue in a real system
    }
  }

  /**
   * Send confirmation emails for a new order
   * @param orderId The order ID
   * @param customerEmail The customer's email address
   * @param orderDetails Details to include in the email
   */
  private async sendConfirmationEmails(
    orderId: string,
    customerEmail: string | undefined,
    orderDetails: {
      orderNumber: string;
      deviceName: string;
      customerName: string;
      estimatedPrice: number;
    }
  ): Promise<void> {
    try {
      // Get the shipping details to include the label URL
      const shippingDetails = await orderRepository.getShippingDetails(orderId);
      
      // Send email to customer if we have their email
      if (customerEmail) {
        await notificationService.sendOrderConfirmationEmail(
          orderId,
          customerEmail,
          {
            orderNumber: orderDetails.orderNumber,
            deviceName: orderDetails.deviceName,
            estimatedPrice: orderDetails.estimatedPrice
          },
          shippingDetails?.shipping_label_url ?? undefined
        );
      }
      
      // Send notification to administrators
      await notificationService.sendNewOrderAdminNotification(
        orderId,
        orderDetails
      );
    } catch (error) {
      console.error(`[OrderService] Error sending confirmation emails for order ${orderId}:`, error);
    }
  }

  /**
   * Send status update notification for an order
   * @param orderId The order ID
   * @param newStatus The new status
   * @param customerEmail The customer's email address
   * @param orderDetails Details to include in the email
   */
  private async sendStatusUpdateNotification(
    orderId: string,
    newStatus: OrderStatus,
    customerEmail: string | undefined,
    orderDetails: {
      orderNumber: string;
      deviceName: string;
      finalPrice?: number;
    }
  ): Promise<void> {
    try {
      // Send email to customer if we have their email
      if (customerEmail) {
        await notificationService.sendOrderStatusUpdateEmail(
          orderId,
          customerEmail,
          newStatus,
          orderDetails
        );
      }
      
      // For certain status changes, we might want to send admin notifications too
      if (newStatus === ORDER_STATUS.ARRIVED) {
        // Example: notify receiving department when a package arrives
        console.log(`[OrderService] Additional notification to receiving department for order ${orderId}`);
      }
    } catch (error) {
      console.error(`[OrderService] Error sending status update notification for order ${orderId}:`, error);
    }
  }

  async checkDeviceEligibility(params: { imei?: string; serialNumber?: string, tenant_id?: number }): Promise<{ purchasable: boolean; reason?: string }> {
    const { imei, serialNumber, tenant_id } = params;

    if (!imei && !serialNumber) {
      throw new Error("IMEI or serialNumber must be provided");
    }

    // Check inventory for existing device
    if (imei) {
      const existingDevice = await deviceService.getDeviceByImei(imei, tenant_id!);
      if (existingDevice) {
        return { purchasable: false, reason: "IN_STOCK" };
      }
    }

    if (serialNumber) {
      const existingDeviceBySerial = await deviceService.getDeviceBySerial(serialNumber, tenant_id!);
      if (existingDeviceBySerial) {
        return { purchasable: false, reason: "IN_STOCK" };
      }
    }

    // Check for already paid orders
    const paidOrder = await orderRepository.findPaidOrderByIdentifier({ imei, serialNumber });
    if (paidOrder) {
      return { purchasable: false, reason: "ALREADY_PAID" };
    }

    return { purchasable: true };
  }
}

// Export a singleton instance
export const orderService = new OrderService(); 