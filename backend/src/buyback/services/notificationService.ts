import { orderRepository } from "../repository/orderRepository";
import { OrderStatus } from "../../db/schema/order";

/**
 * Mock notification service
 * In a real application, this would integrate with an email service provider like AWS SES, SendGrid, etc.
 */

export class NotificationService {
  private apiKey: string;
  private senderEmail: string;
  private adminEmails: string[];

  constructor() {
    // In production, these values would be loaded from environment variables
    this.apiKey = process.env.EMAIL_API_KEY || "mock_api_key";
    this.senderEmail = process.env.SENDER_EMAIL || "notifications@example.com";
    this.adminEmails = process.env.ADMIN_EMAILS?.split(',') || ["admin@example.com"];
  }

  /**
   * Send an order confirmation email to the customer
   * @param orderId - The ID of the order
   * @param recipientEmail - The customer's email address
   * @param orderDetails - Order details for email content
   * @param shippingLabelUrl - URL to the shipping label
   * @param pickupInfo - Optional pickup scheduling information
   * @returns Promise<boolean> indicating success
   */
  async sendOrderConfirmationEmail(
    orderId: string,
    recipientEmail: string,
    orderDetails: {
      orderNumber: string;
      deviceName: string;
      estimatedPrice: number;
    },
    shippingLabelUrl?: string,
    pickupInfo?: {
      pickupDate: string;
      pickupTimeFrom: string;
      pickupTimeUntil: string;
      carrier: string;
    }
  ): Promise<boolean> {
    try {
      // In production, this would make API calls to an email service
      // For this implementation, we'll simulate a successful email send

      console.log(`[NotificationService] Sending order confirmation email to ${recipientEmail} for order ${orderId}`);

      const emailContent = this.generateOrderConfirmationEmail(
        orderDetails.orderNumber,
        orderDetails.deviceName,
        orderDetails.estimatedPrice,
        shippingLabelUrl,
        pickupInfo
      );

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log(`[NotificationService] Email content preview:`);
      console.log(`Subject: Your Device Buyback Order #${orderDetails.orderNumber} Confirmation`);
      console.log(`Email content length: ${emailContent.length} characters`);
      if (pickupInfo) {
        console.log(`Pickup scheduled: ${pickupInfo.pickupDate}`);
      }

      // In production, we would track email delivery status
      return true;
    } catch (error) {
      console.error(`[NotificationService] Error sending order confirmation email for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Send a notification to the customer when their order status changes
   * @param orderId - The ID of the order
   * @param recipientEmail - The customer's email address
   * @param newStatus - The new status of the order
   * @param orderDetails - Additional order details
   * @returns Promise<boolean> indicating success
   */
  async sendOrderStatusUpdateEmail(
    orderId: string,
    recipientEmail: string,
    newStatus: OrderStatus,
    orderDetails: {
      orderNumber: string;
      deviceName: string;
      finalPrice?: number;
    }
  ): Promise<boolean> {
    try {
      console.log(`[NotificationService] Sending status update email (${newStatus}) to ${recipientEmail} for order ${orderId}`);

      const emailContent = this.generateStatusUpdateEmail(
        newStatus,
        orderDetails.orderNumber,
        orderDetails.deviceName,
        orderDetails.finalPrice
      );

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log(`[NotificationService] Email content preview:`);
      console.log(`Subject: Update on Your Device Buyback Order #${orderDetails.orderNumber}`);
      console.log(`Email content length: ${emailContent.length} characters`);

      return true;
    } catch (error) {
      console.error(`[NotificationService] Error sending status update email for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Notify administrators about a new order
   * @param orderId - The ID of the order
   * @param orderDetails - Order details
   * @returns Promise<boolean> indicating success
   */
  async sendNewOrderAdminNotification(
    orderId: string,
    orderDetails: {
      orderNumber: string;
      deviceName: string;
      customerName: string;
      estimatedPrice: number;
    }
  ): Promise<boolean> {
    try {
      console.log(`[NotificationService] Sending admin notification for new order ${orderId}`);

      // In a real implementation, we would send to all admin emails
      for (const adminEmail of this.adminEmails) {
        console.log(`[NotificationService] Sending admin notification to ${adminEmail}`);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return true;
    } catch (error) {
      console.error(`[NotificationService] Error sending admin notification for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Generate the HTML content for an order confirmation email
   */
  private generateOrderConfirmationEmail(
    orderNumber: string,
    deviceName: string,
    estimatedPrice: number,
    shippingLabelUrl?: string,
    pickupInfo?: {
      pickupDate: string;
      pickupTimeFrom: string;
      pickupTimeUntil: string;
      carrier: string;
    }
  ): string {
    // Format pickup date for display
    const formatPickupDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        return dateStr;
      }
    };

    const formatPickupTime = (fromStr: string, untilStr: string) => {
      try {
        const from = new Date(fromStr);
        const until = new Date(untilStr);
        const fromTime = from.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const untilTime = until.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `between ${fromTime} and ${untilTime}`;
      } catch {
        return 'during business hours';
      }
    };

    // This would be a proper HTML template in production
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50;">Your Device Buyback Order Confirmation</h1>
          <p>Thank you for your order #${orderNumber}!</p>
          <p>We're excited to buy back your ${deviceName}.</p>
          
          <h2 style="color: #2c3e50;">Order Summary</h2>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Device:</strong> ${deviceName}</p>
            <p style="margin: 5px 0;"><strong>Estimated Price:</strong> €${estimatedPrice.toFixed(2)}</p>
          </div>
          
          ${pickupInfo ? `
            <h2 style="color: #2c3e50;">📦 Carrier Pickup Scheduled!</h2>
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4caf50;">
              <p style="margin: 5px 0;"><strong>Pickup Date:</strong> ${formatPickupDate(pickupInfo.pickupDate)}</p>
              <p style="margin: 5px 0;"><strong>Time Window:</strong> ${formatPickupTime(pickupInfo.pickupTimeFrom, pickupInfo.pickupTimeUntil)}</p>
              <p style="margin: 5px 0;"><strong>Carrier:</strong> ${pickupInfo.carrier.toUpperCase()}</p>
            </div>
            <h3 style="color: #2c3e50;">What to do:</h3>
            <ol style="line-height: 1.8;">
              <li>Download and print your shipping label: ${shippingLabelUrl ? `<a href="${shippingLabelUrl}" style="color: #3498db;">Download Shipping Label</a>` : 'Label will be available soon'}</li>
              <li>Package your device securely with appropriate padding</li>
              <li>Attach the label to the outside of the package</li>
              <li><strong>Be available at your address on ${formatPickupDate(pickupInfo.pickupDate)} ${formatPickupTime(pickupInfo.pickupTimeFrom, pickupInfo.pickupTimeUntil)}</strong></li>
              <li>Hand the package to the ${pickupInfo.carrier.toUpperCase()} driver when they arrive</li>
            </ol>
          ` : shippingLabelUrl ? `
            <h2 style="color: #2c3e50;">Shipping Instructions</h2>
            <p>Please follow these steps to ship your device to us:</p>
            <ol style="line-height: 1.8;">
              <li>Download your shipping label: <a href="${shippingLabelUrl}" style="color: #3498db;">Download Shipping Label</a></li>
              <li>Package your device securely with appropriate padding</li>
              <li>Attach the label to the outside of the package</li>
              <li>Drop off the package at your nearest carrier location</li>
            </ol>
          ` : '<p>Your shipping label will be available soon.</p>'}
          
          <p style="margin-top: 20px;">Once we receive your device, we'll inspect it to confirm its condition and process your payment.</p>
          <p>Thank you for choosing our buyback service!</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">If you have any questions, please contact our customer support team.</p>
        </body>
      </html>
    `;
  }

  /**
   * Generate the HTML content for a status update email
   */
  private generateStatusUpdateEmail(
    status: OrderStatus,
    orderNumber: string,
    deviceName: string,
    finalPrice?: number
  ): string {
    let statusMessage = '';
    let subject = '';

    switch (status) {
      case 'PENDING':
        statusMessage = 'Your order has been created and is pending shipment.';
        subject = 'Order created successfully!';
        break;
      case 'ARRIVED':
        statusMessage = 'Great news! We\'ve received your device and are reviewing it.';
        subject = 'We\'ve received your device!';
        break;
      case 'PAID':
        statusMessage = `Your buyback order has been completed, and payment has been processed. ${finalPrice !== undefined ? `You've been paid $${finalPrice.toFixed(2)}.` : ''}`;
        subject = 'Your buyback order is complete!';
        break;
      case 'REJECTED':
        statusMessage = 'Unfortunately, we cannot proceed with your buyback order. Please contact our support team for more details.';
        subject = 'Order update - Unable to proceed';
        break;
      default:
        statusMessage = `Your order status has been updated to ${status}`;
        subject = 'Order status update';
    }

    // This would be a proper HTML template in production
    return `
      <html>
        <body>
          <h1>${subject}</h1>
          <p>Order #${orderNumber}</p>
          <p>Device: ${deviceName}</p>
          <p>${statusMessage}</p>
          <p>If you have any questions, please contact our customer support team.</p>
          <p>Thank you for choosing our buyback service!</p>
        </body>
      </html>
    `;
  }
}

// Export a singleton instance
export const notificationService = new NotificationService(); 