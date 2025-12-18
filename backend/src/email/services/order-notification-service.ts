import { getEmailService } from './email-service';
import { emailTemplateService } from '../../email-templates/services/email-template-service';

import { OrderStatus } from '../../db/order.schema';

import { EMAIL_TEMPLATE_TYPE } from '../../email-templates';
import { shipping_details } from '../../db/order.schema';
import { shops } from '../../db/shops.schema';
import { db } from '../../db';
import { eq } from 'drizzle-orm';

/**
 * Maps order status to corresponding email template type
 */
const ORDER_STATUS_TO_TEMPLATE_TYPE: Record<OrderStatus, keyof typeof EMAIL_TEMPLATE_TYPE | null> = {
  PENDING: 'ORDER_CONFIRMATION',
  ARRIVED: 'SHIPMENT_RECEIVED',
  PAID: 'ORDER_COMPLETED',
  REJECTED: 'OFFER_REJECTED'
};

export class OrderNotificationService {
  /**
   * Send order status notification email
   */
  async sendOrderStatusNotification(
    orderId: string,
    status: OrderStatus,
    shopId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the template type for this order status
      console.log("status", status);
      const templateType = ORDER_STATUS_TO_TEMPLATE_TYPE[status];

      // Skip if no template type is defined for this status
      if (!templateType) {
        console.log(`[OrderNotificationService] No template type defined for status: ${status}`);
        return { success: true };
      }

      // Get tenantId for the shop
      const shop = await db.query.shops.findFirst({
        where: eq(shops.id, shopId),
        columns: { tenant_id: true }
      });

      if (!shop) {
        console.error(`[OrderNotificationService] Shop not found: ${shopId}`);
        return { success: false, error: 'Shop not found' };
      }

      const tenantId = Number(shop.tenant_id);

      // Get templates of this type for the shop
      const templates = await emailTemplateService.getTemplates(shopId, tenantId, {
        templateType,
        isActive: true
      });

      // Skip if no active template is found
      if (!templates || templates.data.length === 0) {
        console.log(`[OrderNotificationService] No active ${templateType} template found for shop: ${shopId}`);
        return { success: true };
      }

      // Use the first active template
      const template = templates.data[0];

      // Get order data and populate the template
      const populated = await emailTemplateService.populateTemplate(
        {
          templateId: template.id,
          orderId
        },
        shopId,
        tenantId
      );

      if (!populated) {
        console.error(`[OrderNotificationService] Failed to populate template for order: ${orderId}`);
        return { success: false, error: 'Failed to populate email template' };
      }

      // Get order data for recipient details - directly from the database since getOrderData is private in EmailTemplateService
      const shippingData = await db
        .select()
        .from(shipping_details)
        .where(eq(shipping_details.orderId, orderId))
        .limit(1);

      if (!shippingData || shippingData.length === 0 || !shippingData[0].seller_email) {
        console.error(`[OrderNotificationService] No seller email found for order: ${orderId}`);
        return { success: false, error: 'No seller email found' };
      }

      const sellerEmail = shippingData[0].seller_email;

      const emailService = getEmailService();

      // Send the email
      const result = await emailService.sendEmail({
        to: sellerEmail,
        subject: populated.subject,
        html: populated.content
        // Note: We can't get shop name easily here since we fixed the getOrderData issue
        // A more complete solution would join with the shops table in the db query above
      });

      if (!result.success) {
        console.error(`[OrderNotificationService] Failed to send email for order: ${orderId}`, result.error);
        return { success: false, error: result.error };
      }

      console.log(`[OrderNotificationService] Email sent successfully for order: ${orderId}, status: ${status}`);
      return { success: true };
    } catch (error: any) {
      console.error(`[OrderNotificationService] Error sending notification:`, error);
      return { success: false, error: error.message || 'Error sending notification' };
    }
  }
}

// Export a singleton instance
export const orderNotificationService = new OrderNotificationService();
