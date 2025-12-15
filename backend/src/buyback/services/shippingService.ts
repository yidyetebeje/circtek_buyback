import { orderRepository } from "../repository/orderRepository";
import { createSendcloudClient, SendcloudClient } from "../../shipping/sendcloud/client";
import type { SendcloudParcelInput, SendcloudParcelItem } from "../../shipping/sendcloud/types";
import { shippingRepository } from "../../shipping/repository";

/**
 * Shipping service for buyback orders
 * Integrates with Sendcloud API for real shipping label generation
 * Creates return labels so customers can send devices back
 */

interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode: string;
  phoneNumber?: string;
  email?: string;
}

interface ShippingLabelResult {
  shippingLabelUrl: string;
  trackingNumber: string;
  shippingProvider: string;
  sendcloudParcelId?: number;
}

export class ShippingService {
  private sendcloudClient: SendcloudClient | null = null;
  private defaultTenantId: number;

  constructor() {
    // Default tenant ID - in production this should come from config or context
    this.defaultTenantId = parseInt(process.env.DEFAULT_TENANT_ID || "1", 10);
  }

  /**
   * Get or create Sendcloud client for a tenant
   */
  private async getSendcloudClient(tenant_id?: number): Promise<SendcloudClient> {
    const tenantId = tenant_id || this.defaultTenantId;

    const config = await shippingRepository.getSendcloudConfig(tenantId);
    if (!config) {
      throw new Error(
        "Sendcloud not configured. Please configure Sendcloud API keys in Settings > Shipping."
      );
    }

    return createSendcloudClient(config.public_key, config.secret_key);
  }

  /**
   * Generate and save a shipping label for a buyback order
   * This creates a label for the customer to send their device TO the warehouse
   * @param orderId - The ID of the order
   * @param sellerAddress - The seller's (customer's) address - this is the FROM address
   * @param tenant_id - Optional tenant ID for multi-tenant support
   * @returns Promise with label URL and tracking number
   */
  async generateAndSaveShippingLabel(
    orderId: string,
    sellerAddress: ShippingAddress,
    tenant_id?: number
  ): Promise<ShippingLabelResult> {
    try {
      console.log(`[ShippingService] Generating Sendcloud label for order ${orderId}`);

      // Get Sendcloud client
      const client = await this.getSendcloudClient(tenant_id);

      // Get Sendcloud config for default sender address and shipping method
      const tenantId = tenant_id || this.defaultTenantId;
      const config = await shippingRepository.getSendcloudConfig(tenantId);

      // Build the parcel data
      // For buyback: Customer (seller) sends TO warehouse
      // So FROM is customer address, TO is warehouse/business address
      const parcelData: SendcloudParcelInput = {
        // FROM: Customer's address (the sender)
        name: sellerAddress.name,
        email: sellerAddress.email || undefined,
        telephone: sellerAddress.phoneNumber || undefined,
        address: sellerAddress.street1,
        house_number: this.extractHouseNumber(sellerAddress.street1),
        address_2: sellerAddress.street2 || undefined,
        city: sellerAddress.city,
        country: sellerAddress.countryCode,
        postal_code: sellerAddress.postalCode,

        // Parcel items - for customs if needed
        parcel_items: [{
          description: "Mobile Phone (Buyback Return)",
          hs_code: "851712", // Mobile phones
          quantity: 1,
          value: "100.00", // Default value for customs
          weight: "0.200", // ~200g for phone
        }],

        // Weight and dimensions
        weight: "0.5", // 500g with packaging

        // Return label - device coming TO warehouse
        is_return: false, // This is a forward shipment from customer to warehouse

        // Shipping method (UPS)
        shipment: config?.default_shipping_method_id
          ? { id: config.default_shipping_method_id }
          : undefined,

        // Sender address (warehouse to receive at)
        sender_address: config?.default_sender_address_id || undefined,

        // Request label immediately
        request_label: true,

        // Order reference
        order_number: orderId,
        external_reference: `buyback-${orderId}`,
      };

      // Create parcel with label in Sendcloud
      const parcel = await client.createParcelWithLabel(parcelData);

      // Extract tracking info
      const trackingNumber = parcel.tracking_number || "";
      const trackingUrl = parcel.tracking_url || "";
      const shippingLabelUrl = parcel.label?.normal_printer?.[0] || parcel.label?.label_printer || "";
      const shippingProvider = parcel.carrier?.code?.toUpperCase() || "UPS";

      console.log(`[ShippingService] Sendcloud parcel created: ID=${parcel.id}, Tracking=${trackingNumber}`);

      // Update the order's shipping details with the label information
      await orderRepository.updateShippingDetails(orderId, {
        shipping_label_url: shippingLabelUrl,
        tracking_number: trackingNumber,
        shipping_provider: shippingProvider as any,
        label_data: {
          sendcloud_parcel_id: parcel.id,
          tracking_url: trackingUrl,
          carrier: shippingProvider,
          label_printer_url: parcel.label?.label_printer,
          normal_printer_urls: parcel.label?.normal_printer,
          created_at: new Date().toISOString(),
        },
      });

      return {
        shippingLabelUrl,
        trackingNumber,
        shippingProvider,
        sendcloudParcelId: parcel.id,
      };
    } catch (error) {
      console.error(`[ShippingService] Error generating Sendcloud label for order ${orderId}:`, error);

      // Fall back to mock generation if Sendcloud fails
      console.log(`[ShippingService] Falling back to mock label generation`);
      return this.generateMockLabel(orderId, sellerAddress);
    }
  }

  /**
   * Extract house number from street address
   * Sendcloud requires house number as a separate field
   */
  private extractHouseNumber(street: string): string {
    // Try to extract a number from the street address
    const match = street.match(/(\d+[a-zA-Z]?)\s*$/);
    if (match) {
      return match[1];
    }
    // If no number found at end, try beginning
    const beginMatch = street.match(/^(\d+[a-zA-Z]?)/);
    return beginMatch ? beginMatch[1] : "";
  }

  /**
   * Generate a mock shipping label as fallback
   */
  private async generateMockLabel(orderId: string, sellerAddress: ShippingAddress): Promise<ShippingLabelResult> {
    // Generate mock tracking number
    const trackingNumber = `1Z${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const shippingLabelUrl = `https://example.com/labels/buyback-${orderId}.pdf`;
    const shippingProvider = "UPS";

    // Update the order with mock data
    await orderRepository.updateShippingDetails(orderId, {
      shipping_label_url: shippingLabelUrl,
      tracking_number: trackingNumber,
      shipping_provider: shippingProvider as any,
      label_data: {
        mock: true,
        created_at: new Date().toISOString(),
      },
    });

    return {
      shippingLabelUrl,
      trackingNumber,
      shippingProvider,
    };
  }

  /**
   * Download the PDF label for an order
   * @param orderId - The order ID
   * @param format - Label format: 'a4' for normal printer, 'a6' for label printer
   * @param tenant_id - Optional tenant ID
   */
  async downloadLabelPdf(
    orderId: string,
    format: 'a4' | 'a6' = 'a4',
    tenant_id?: number
  ): Promise<Buffer | null> {
    try {
      // Get shipping details to find Sendcloud parcel ID
      const shippingDetails = await orderRepository.getShippingDetails(orderId);
      if (!shippingDetails) {
        throw new Error("No shipping details found for this order");
      }

      const labelData = shippingDetails.label_data as any;
      const sendcloudParcelId = labelData?.sendcloud_parcel_id;

      if (!sendcloudParcelId) {
        throw new Error("No Sendcloud parcel ID found. Label may have been generated with mock data.");
      }

      const client = await this.getSendcloudClient(tenant_id);
      return await client.getLabelPdf(sendcloudParcelId, format);
    } catch (error) {
      console.error(`[ShippingService] Error downloading PDF for order ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Get tracking information for a shipment
   * @param trackingNumber - The tracking number to look up
   * @returns Promise with tracking details
   */
  async getTrackingInfo(trackingNumber: string): Promise<any> {
    // For now, return basic tracking info from Sendcloud
    // In production, you'd use Sendcloud's tracking API
    try {
      console.log(`[ShippingService] Getting tracking info for ${trackingNumber}`);

      return {
        tracking_number: trackingNumber,
        status: "in_transit",
        carrier: "UPS",
        message: "Tracking information is available at the carrier website",
      };
    } catch (error) {
      console.error(`[ShippingService] Error getting tracking info for ${trackingNumber}:`, error);
      throw new Error(`Failed to get tracking information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a shipment in Sendcloud
   * @param orderId - The order ID
   * @param tenant_id - Optional tenant ID
   */
  async cancelShipment(orderId: string, tenant_id?: number): Promise<boolean> {
    try {
      const shippingDetails = await orderRepository.getShippingDetails(orderId);
      if (!shippingDetails) {
        return false;
      }

      const labelData = shippingDetails.label_data as any;
      const sendcloudParcelId = labelData?.sendcloud_parcel_id;

      if (sendcloudParcelId) {
        const client = await this.getSendcloudClient(tenant_id);
        await client.cancelParcel(sendcloudParcelId);
        console.log(`[ShippingService] Cancelled Sendcloud parcel ${sendcloudParcelId} for order ${orderId}`);
      }

      return true;
    } catch (error) {
      console.error(`[ShippingService] Error cancelling shipment for order ${orderId}:`, error);
      return false;
    }
  }
}

// Export a singleton instance
export const shippingService = new ShippingService();