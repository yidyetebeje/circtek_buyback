import { orderRepository } from "../repository/orderRepository";
import { createSendcloudClient, SendcloudClient } from "../../shipping/sendcloud/client";
import type { SendcloudV3ShipmentInput, SendcloudV3Item, SendcloudV3ShipWith } from "../../shipping/sendcloud/types";
import { shippingRepository } from "../../shipping/repository";

/**
 * Shipping service for buyback orders
 * Integrates with Sendcloud API v3 for real shipping label generation
 * Creates labels so customers can send devices back to warehouse
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
  private defaultTenantId: number;

  constructor() {
    // Default tenant ID - in production this should come from config or context
    this.defaultTenantId = parseInt(process.env.DEFAULT_TENANT_ID || "1", 10);
  }

  /**
   * Get or create Sendcloud client for a shop
   * Now requires shop_id as sendcloud config is shop-scoped
   */
  private async getSendcloudClient(shop_id: number, tenant_id?: number): Promise<SendcloudClient> {
    const tenantId = tenant_id || this.defaultTenantId;

    const configDecrypted = await shippingRepository.getSendcloudConfigDecrypted(shop_id, tenantId);
    if (!configDecrypted) {
      throw new Error(
        "Sendcloud not configured for this shop. Please configure Sendcloud API keys in Settings > Shipping."
      );
    }

    return createSendcloudClient(configDecrypted.public_key, configDecrypted.secret_key, configDecrypted.use_test_mode ?? false);
  }

  /**
   * Generate and save a shipping label for a buyback order using Sendcloud V3 API
   * This creates a label for the customer to send their device TO the warehouse
   * @param orderId - The ID of the order
   * @param sellerAddress - The seller's (customer's) address - this is the FROM address
   * @param shop_id - The shop ID (required for shop-scoped Sendcloud config)
   * @param tenant_id - Optional tenant ID for multi-tenant support
   * @returns Promise with label URL and tracking number
   */
  async generateAndSaveShippingLabel(
    orderId: string,
    sellerAddress: ShippingAddress,
    shop_id: number,
    tenant_id?: number
  ): Promise<ShippingLabelResult> {
    try {
      console.log(`[ShippingService] Generating Sendcloud V3 label for order ${orderId} (shop_id: ${shop_id})`);

      // Get Sendcloud client for this shop
      const client = await this.getSendcloudClient(shop_id, tenant_id);

      // Get Sendcloud config for shipping product code
      const tenantId = tenant_id || this.defaultTenantId;
      const config = await shippingRepository.getSendcloudConfig(shop_id, tenantId);

      // Always fetch available shipping options to show what's valid for this account
      const fromCountry = sellerAddress.countryCode; // Customer's country
      const toCountry = 'NL'; // Warehouse country (Netherlands)

      console.log(`[ShippingService] Fetching shipping options from ${fromCountry} to ${toCountry}...`);

      let shippingOptions: any = null;
      try {
        shippingOptions = await client.getShippingOptions(fromCountry, toCountry);
        console.log(`[ShippingService] Raw API response for shipping options:`);
        console.log('='.repeat(80));
        console.log(JSON.stringify(shippingOptions, null, 2));
        console.log('='.repeat(80));
      } catch (err) {
        console.error(`[ShippingService] Failed to fetch shipping options:`, err);
      }

      // Extract and display all available options
      const options = shippingOptions?.data || shippingOptions?.shipping_options || shippingOptions || [];

      if (Array.isArray(options) && options.length > 0) {
        console.log(`[ShippingService] Found ${options.length} available shipping options:`);
        console.log('-'.repeat(80));
        options.forEach((opt: any, idx: number) => {
          const code = opt.code || opt.shipping_option_code || opt.id || 'N/A';
          const name = opt.name || opt.carrier?.name || 'N/A';
          const carrier = opt.carrier?.code || opt.carrier || 'N/A';
          const price = opt.price?.value || opt.price || 'N/A';
          const currency = opt.price?.currency || '';
          console.log(`  ${idx + 1}. shipping_option_code: "${code}"`);
          console.log(`     Name: ${name}`);
          console.log(`     Carrier: ${carrier}`);
          console.log(`     Price: ${price} ${currency}`);
          console.log(`     Full object: ${JSON.stringify(opt)}`);
          console.log('-'.repeat(40));
        });
      } else {
        console.log(`[ShippingService] No shipping options array found. Response structure:`);
        console.log(Object.keys(shippingOptions || {}));
      }

      // Determine which shipping option code to use
      let shippingOptionCode = config?.default_shipping_option_code;

      if (shippingOptionCode) {
        console.log(`[ShippingService] Using configured shipping_option_code: ${shippingOptionCode}`);
      } else if (Array.isArray(options) && options.length > 0) {
        // Auto-select the first available option
        shippingOptionCode = options[0].code || options[0].shipping_option_code || options[0].id;
        console.log(`[ShippingService] Auto-selecting first available option: ${shippingOptionCode}`);
      } else {
        throw new Error(`No shipping options available from ${fromCountry} to ${toCountry}. Please configure default_shipping_option_code in sendcloud_config.`);
      }

      // Build V3 shipment items
      const items: SendcloudV3Item[] = [{
        description: "Mobile Phone (Buyback Return)",
        quantity: 1,
        weight: "0.200", // ~200g for phone
        value: "100.00",
        hs_code: "851712", // Mobile phones
      }];

      // V3 requires ship_with with type + properties structure
      const shipWith: SendcloudV3ShipWith = {
        type: 'shipping_option_code',
        properties: {
          shipping_option_code: shippingOptionCode as string, // Already validated above
        },
      };

      // Build V3 shipment data
      // For buyback: Customer (seller) sends the device TO the warehouse
      // from_address = customer (seller), to_address = warehouse
      const shipmentData: SendcloudV3ShipmentInput = {
        // FROM: Customer's address (the sender of the device)
        from_address: {
          name: sellerAddress.name,
          email: sellerAddress.email || undefined,
          phone_number: sellerAddress.phoneNumber || undefined,
          address_line_1: sellerAddress.street1,
          address_line_2: sellerAddress.street2 || undefined,
          house_number: this.extractHouseNumber(sellerAddress.street1),
          city: sellerAddress.city,
          postal_code: sellerAddress.postalCode,
          country_code: sellerAddress.countryCode,
          // Note: state_province_code must be ISO state code, not city name!
          // Only set if it's a valid state code (2-3 chars)
          state_province_code: sellerAddress.stateProvince?.length <= 3 ? sellerAddress.stateProvince : undefined,
        },
        // TO: Warehouse address (where device is being sent)
        // TODO: Get actual warehouse address from config or warehouse table
        to_address: {
          name: "Remarketed Warehouse",
          address_line_1: "Warehouse Street 1",
          city: "Amsterdam",
          postal_code: "1000AA",
          country_code: "NL",
        },
        parcels: [{
          weight: { value: 0.5, unit: "kg" }, // V3 requires weight as object!
          items,
        }],
        ship_with: shipWith, // V3 REQUIRED!
        request_label: true,
        order_number: orderId,
        external_reference: `buyback-${orderId}`,
        total_order_value: "100.00",
        total_order_value_currency: "EUR",
      };

      // Create shipment with label in Sendcloud V3
      const response = await client.createShipment(shipmentData);

      // Get the first parcel from response
      const parcel = response.parcels?.[0];
      if (!parcel) {
        throw new Error("No parcel returned from Sendcloud");
      }

      // Extract tracking info
      const trackingNumber = parcel.tracking_number || "";
      const trackingUrl = parcel.tracking_url || "";
      const labelDoc = parcel.documents?.find(d => d.type === 'label');
      const shippingLabelUrl = labelDoc?.link || "";
      const shippingProvider = parcel.carrier?.code?.toUpperCase() || "UPS";

      console.log(`[ShippingService] Sendcloud V3 parcel created: ID=${parcel.id}, Tracking=${trackingNumber}`);

      // Update the order's shipping details with the label information
      await orderRepository.updateShippingDetails(orderId, {
        shipping_label_url: shippingLabelUrl,
        tracking_number: trackingNumber,
        shipping_provider: shippingProvider as any,
        label_data: {
          sendcloud_parcel_id: parcel.id,
          tracking_url: trackingUrl,
          carrier: shippingProvider,
          label_url: shippingLabelUrl,
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
   * @param shop_id - The shop ID (required for shop-scoped Sendcloud config)
   * @param tenant_id - Optional tenant ID
   */
  async downloadLabelPdf(
    orderId: string,
    format: 'a4' | 'a6' = 'a4',
    shop_id: number,
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

      const client = await this.getSendcloudClient(shop_id, tenant_id);
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
   * @param shop_id - The shop ID (required for shop-scoped Sendcloud config)
   * @param tenant_id - Optional tenant ID
   */
  async cancelShipment(orderId: string, shop_id: number, tenant_id?: number): Promise<boolean> {
    try {
      const shippingDetails = await orderRepository.getShippingDetails(orderId);
      if (!shippingDetails) {
        return false;
      }

      const labelData = shippingDetails.label_data as any;
      const sendcloudParcelId = labelData?.sendcloud_parcel_id;

      if (sendcloudParcelId) {
        const client = await this.getSendcloudClient(shop_id, tenant_id);
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