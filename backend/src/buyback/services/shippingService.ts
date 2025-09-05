import { orderRepository } from "../repository/orderRepository";

/**
 * Mock shipping service
 * In a real application, this would integrate with a shipping API provider like EasyPost, Shippo, etc.
 */

// Example business recipient address
const BUSINESS_ADDRESS = {
  name: "Device Buyback Company",
  street1: "123 Warehouse Ave",
  city: "Business City",
  state: "BC",
  zip: "12345",
  country: "US",
  phone: "555-123-4567",
  email: "receiving@example.com"
};

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

export class ShippingService {
  private apiKey: string;

  constructor() {
    // In production, this would be loaded from environment variables
    this.apiKey = process.env.SHIPPING_API_KEY || "mock_api_key";
  }

  /**
   * Generate and save a shipping label for an order
   * @param orderId - The ID of the order
   * @param sellerAddress - The seller's address details
   * @returns Promise with label URL and tracking number
   */
  async generateAndSaveShippingLabel(orderId: string, sellerAddress: ShippingAddress): Promise<{
    shippingLabelUrl: string;
    trackingNumber: string;
    shippingProvider: string;
  }> {
    // In production, this would make API calls to a shipping provider
    // For this implementation, we'll simulate a successful response

    try {
      // Build the request payload that would be sent to the shipping API
      const shippingRequestPayload = {
        from_address: {
          name: sellerAddress.name,
          street1: sellerAddress.street1,
          street2: sellerAddress.street2 || "",
          city: sellerAddress.city,
          state: sellerAddress.stateProvince,
          zip: sellerAddress.postalCode,
          country: sellerAddress.countryCode,
          phone: sellerAddress.phoneNumber || "",
          email: sellerAddress.email || ""
        },
        to_address: BUSINESS_ADDRESS,
        parcel: {
          length: 8,
          width: 5,
          height: 2,
          weight: 10, // in ounces
          predefined_package: "SMALL_FLAT_RATE_BOX"
        },
        service: "USPS_PRIORITY",
        label_format: "PDF"
      };

      // Log the request that would be made in production
      console.log(`[ShippingService] Generating label for order ${orderId}`);
      console.log("[ShippingService] Request payload:", shippingRequestPayload);

      // Simulate API response delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate mock tracking number
      const trackingNumber = `MOCK${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`;
      
      // Generate mock shipping label URL
      // In a real implementation, this would be the URL returned by the shipping API
      const shippingLabelUrl = `https://example.com/shipping-labels/${orderId}.pdf`;
      
      // Mock shipping provider
      const shippingProvider = "USPS";

      // Mock response data that would come from the shipping API
      const mockApiResponse = {
        id: `shipment_${orderId}`,
        tracking_number: trackingNumber,
        label_url: shippingLabelUrl,
        status: "created",
        carrier: shippingProvider,
        service: "USPS_PRIORITY",
        created_at: new Date().toISOString(),
        parcel: shippingRequestPayload.parcel
      };

      // Update the order's shipping details with the label information
      await orderRepository.updateShippingDetails(orderId, {
        shippingLabelUrl,
        trackingNumber,
        shippingProvider,
        labelData: mockApiResponse
      });

      return {
        shippingLabelUrl,
        trackingNumber,
        shippingProvider
      };
    } catch (error) {
      console.error(`[ShippingService] Error generating label for order ${orderId}:`, error);
      throw new Error(`Failed to generate shipping label: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get tracking information for a shipment
   * @param trackingNumber - The tracking number to look up
   * @returns Promise with tracking details
   */
  async getTrackingInfo(trackingNumber: string): Promise<any> {
    // In production, this would make API calls to the shipping provider
    // For this implementation, we'll simulate a response

    try {
      console.log(`[ShippingService] Getting tracking info for ${trackingNumber}`);
      
      // Simulate API response delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate a random status based on time
      const statuses = ["pre_transit", "in_transit", "out_for_delivery", "delivered"];
      const randomStatusIndex = Math.floor(Math.random() * statuses.length);
      
      return {
        tracking_number: trackingNumber,
        status: statuses[randomStatusIndex],
        carrier: "USPS",
        tracking_details: [
          {
            message: "Shipping label created",
            status: "pre_transit",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
          },
          {
            message: randomStatusIndex >= 1 ? "Package received by carrier" : null,
            status: randomStatusIndex >= 1 ? "in_transit" : null,
            timestamp: randomStatusIndex >= 1 ? new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() : null
          },
          {
            message: randomStatusIndex >= 2 ? "Out for delivery" : null,
            status: randomStatusIndex >= 2 ? "out_for_delivery" : null,
            timestamp: randomStatusIndex >= 2 ? new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() : null
          },
          {
            message: randomStatusIndex >= 3 ? "Delivered" : null,
            status: randomStatusIndex >= 3 ? "delivered" : null,
            timestamp: randomStatusIndex >= 3 ? new Date().toISOString() : null
          }
        ].filter(detail => detail.status !== null)
      };
    } catch (error) {
      console.error(`[ShippingService] Error getting tracking info for ${trackingNumber}:`, error);
      throw new Error(`Failed to get tracking information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const shippingService = new ShippingService(); 