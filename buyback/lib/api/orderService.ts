import { ApiClient, createApiClient } from './base';
import { ApiResponse } from './types';

// Types based on the API documentation

interface DeviceSnapshot {
  modelName: string;
  [key: string]: unknown; // Allow additional properties
}

export interface ShopInfo {
  id: number;
  name: string;
  organization: string;
  phone: string;
  logo: string;
  active: boolean;
}

interface ConditionAnswer {
  questionKey: string;
  questionTextSnapshot: string;
  answerValue: unknown;
  answerTextSnapshot?: string;
}

interface SellerAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode: string; // ISO 3166-1 alpha-2 code
  phoneNumber?: string;
  email?: string;
}

export interface CreateOrderPayload {
  deviceId: number; // Numeric ID of the device model
  deviceSnapshot: DeviceSnapshot;
  estimatedPrice: number;
  conditionAnswers: ConditionAnswer[];
  sellerAddress: SellerAddress;
  sellerNotes?: string;
  tenantId: number;
  shopId: number;
}

// Extended interface for admin-created orders
export interface CreateAdminOrderPayload extends CreateOrderPayload {
  status?: 'PENDING' | 'ARRIVED' | 'PAID' | 'REJECTED';
  finalPrice?: number;
  imei?: string;
  sku?: string;
  serialNumber?: string;
  warehouseId?: number;
  testingInfo?: {
    deviceTransactionId: string;
    testedAt: string;
    testResults?: unknown;
    warehouseId?: number;
    warehouseName?: string;
  };
}

export interface CreateOrderResponseData {
  orderId: string;
  orderNumber: string;
  status: string; // OrderStatus enum
  shippingLabelUrl?: string;
  message: string;
}

export type CreateOrderResponse = ApiResponse<CreateOrderResponseData>;

// Admin types based on API documentation

export interface OrderListItem {
  id: string;
  orderNumber: string;
  deviceId: number;
  deviceSnapshot: DeviceSnapshot; // Re-using existing DeviceSnapshot
  estimatedPrice: string; // As per doc, repository returns string
  finalPrice?: string;
  status: string; // OrderStatus enum
  createdAt: string; // date-time
  updatedAt: string; // date-time
  sellerName?: string; 
  shop?: ShopInfo;
}

export interface AdminListOrdersResponseData {
  orders: OrderListItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}
export type AdminListOrdersResponse = ApiResponse<AdminListOrdersResponseData>;

// Shipping information as returned by the API
export interface ShippingInfo {
  id: string;
  orderId: string;
  sellerName: string;
  sellerStreet1: string;
  sellerStreet2?: string;
  sellerCity: string;
  sellerStateProvince: string;
  sellerPostalCode: string;
  sellerCountryCode: string;
  sellerPhoneNumber?: string;
  sellerEmail?: string;
  shippingLabelUrl?: string;
  trackingNumber?: string;
  shippingProvider?: string;
  labelData?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderDetail {
    id: string;
    orderNumber: string;
    deviceId: number;
    deviceSnapshot: DeviceSnapshot;
    estimatedPrice: number; // Assuming conversion to number here, or keep as string
    finalPrice?: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    conditionAnswers: ConditionAnswer[];
    shipping: ShippingInfo;
    sellerNotes?: string;
    clientId: number;
    shopId: number;
    shop?: ShopInfo;
    statusHistory?: { status: string; changedAt: string; notes?: string; changedByUserName?: string }[];
    adminNotes?: string;
}
export type AdminGetOrderDetailsResponse = ApiResponse<AdminOrderDetail>;


export interface UpdateOrderStatusPayload {
  newStatus: 'PENDING' | 'ARRIVED' | 'PAID' | 'REJECTED'; // Updated to new 4-status system
  adminNotes?: string;
  finalPrice?: number; // Required when newStatus is PAID
  imei?: string; // Required when newStatus is PAID
  sku?: string; // Required when newStatus is PAID
  warehouseId?: number; // Required when newStatus is PAID
}

// Response for update is the full updated order object
export type AdminUpdateOrderStatusResponse = ApiResponse<AdminOrderDetail>; 


export interface AdminListOrdersParams {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  clientId?: number; // For admin to filter by a specific client ID
  shopId?: number; // Filter orders by shop ID
}


export class OrderService {
  private apiClient: ApiClient;
  private baseEndpoint = '/api/buyback/orders'; // Base endpoint for orders

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || createApiClient();
  }

  /**
   * Create a new buyback order
   */
  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
    return this.apiClient.post<CreateOrderResponse>(`${this.baseEndpoint}/`, payload);
  }

  /**
   * Create a new admin buyback order (with additional admin fields)
   */
  async createAdminOrder(payload: CreateAdminOrderPayload): Promise<CreateOrderResponse> {
    return this.apiClient.post<CreateOrderResponse>(`${this.baseEndpoint}/admin`, payload, { isProtected: true });
  }

  /**
   * List all orders (accessible by admin and other authenticated users based on roles)
   */
  async listOrders(params?: AdminListOrdersParams): Promise<AdminListOrdersResponse> {
    return this.apiClient.get<AdminListOrdersResponse>(`${this.baseEndpoint}/`, { 
      params: params as Record<string, string | number | boolean | undefined>,
      isProtected: true 
    });
  }

  /**
   * Get order details (Admin)
   */
  async getOrderDetailsAdmin(orderId: string): Promise<AdminGetOrderDetailsResponse> {
    return this.apiClient.get<AdminGetOrderDetailsResponse>(`${this.baseEndpoint}/admin/${orderId}`, { isProtected: true });
  }

  /**
   * Update order status (Admin)
   */
  async updateOrderStatusAdmin(orderId: string, payload: UpdateOrderStatusPayload): Promise<AdminUpdateOrderStatusResponse> {
    return this.apiClient.put<AdminUpdateOrderStatusResponse>(`${this.baseEndpoint}/admin/${orderId}/status`, payload, { isProtected: true });
  }

  /**
   * Check if a device (by IMEI or serial) is eligible for purchase.
   */
  async checkDeviceEligibility(params: { imei?: string; serial?: string }): Promise<ApiResponse<{ purchasable: boolean; reason?: string }>> {
    return this.apiClient.get(`${this.baseEndpoint}/admin/device-check`, { params, isProtected: true });
  }
}

// Create a default instance
export const orderService = new OrderService();

// Export a function to create an instance with a specific client
export const createOrderService = (apiClient?: ApiClient) => new OrderService(apiClient); 