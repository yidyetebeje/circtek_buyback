import { Elysia, t } from "elysia";
import { orderController } from "../controller/orderController";
import { ORDER_STATUS } from "../../db/order.schema";

import { requireRole } from '../../auth'
import { isValidIBAN } from "ibantools";

const baseOrderObject = {
  deviceId: t.Number({ minimum: 1, error: "Device ID is required" }),
  deviceSnapshot: t.Object({ modelName: t.String() }, { additionalProperties: true }),
  estimatedPrice: t.Number({ minimum: 0, error: "Estimated price must be positive" }),
  conditionAnswers: t.Array(t.Object({
    questionKey: t.String(),
    questionTextSnapshot: t.String(),
    answerValue: t.Any(),
    answerTextSnapshot: t.Optional(t.String())
  })),
  sellerAddress: t.Object({
    name: t.String({ minLength: 1, error: "Seller name is required" }),
    street1: t.String({ minLength: 1, error: "Street address is required" }),
    street2: t.Optional(t.String()),
    city: t.String({ minLength: 1, error: "City is required" }),
    stateProvince: t.String({ minLength: 1, error: "State/Province is required" }),
    postalCode: t.String({ minLength: 1, error: "Postal code is required" }),
    countryCode: t.String({ minLength: 2, maxLength: 2, error: "Country code must be 2 letters" }),
    phoneNumber: t.Optional(t.String()),
    email: t.Optional(t.String({ format: "email" })),
    iban: t.Optional(t.String({
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        return isValidIBAN(value);
      },
      error: "Invalid IBAN format"
    }))
  }),
  sellerNotes: t.Optional(t.String())
};

const createOrderSchema = {
  body: t.Object({
    ...baseOrderObject,
    tenantId: t.Number({ minimum: 1, error: "Tenant ID is required" }),
    shopId: t.Number({ minimum: 1, error: "Shop ID is required" })
  })
};

const updateOrderStatusSchema = {
  body: t.Union([
    // Schema for PAID status - requires additional fields for device creation
    t.Object({
      newStatus: t.Literal("PAID"),
      adminNotes: t.Optional(t.String()),
      finalPrice: t.Number({ minimum: 0, error: "Final price is required when marking an order as PAID" }),
      imei: t.String({ minLength: 1, error: "IMEI is required when marking an order as PAID" }),
      sku: t.String({ minLength: 1, error: "SKU is required when marking an order as PAID" }),
      warehouseId: t.Number({ minimum: 1, error: "Warehouse ID is required when marking an order as PAID" })
    }),
    // Schema for other statuses - additional fields are optional
    t.Object({
      newStatus: t.Enum(ORDER_STATUS, { error: "Invalid status" }), 
      adminNotes: t.Optional(t.String()),
      finalPrice: t.Optional(t.Number({ minimum: 0 })),
      imei: t.Optional(t.String()),
      sku: t.Optional(t.String()),
      warehouseId: t.Optional(t.Number({ minimum: 1 }))
    })
  ]),
  params: t.Object({ orderId: t.String({ minLength: 1 }) })
};

const orderIdParamsSchema = t.Object({ orderId: t.String({ minLength: 1 }) });

const createAdminOrderSchema = {
  body: t.Object({
    ...baseOrderObject,
    shopId: t.Number({ minimum: 1, error: "Shop ID is required" }),
    clientId: t.Optional(t.Number({ minimum: 1 })), // Optional for admin creation, will be determined by service
    
    status: t.Optional(t.Enum(ORDER_STATUS)),
    finalPrice: t.Number({ minimum: 0, error: "Final price is required" }),
    imei: t.String({ minLength: 1, error: "IMEI is required" }),
    sku: t.String({ minLength: 1, error: "SKU is required" }),
    serialNumber: t.String({ minLength: 1, error: "Serial number is required" }),
    warehouseId: t.Number({ minimum: 1, error: "Warehouse ID is required" }),
    
    testingInfo: t.Optional(t.Object({
      deviceTransactionId: t.String(),
      testedAt: t.String(),
      testResults: t.Optional(t.Any()),
      warehouseId: t.Optional(t.Number()),
      warehouseName: t.Optional(t.String())
    }))
  })
};

const listOrdersQueryBaseSchema = {
  status: t.Optional(t.Enum(ORDER_STATUS)),
  dateFrom: t.Optional(t.String({ format: "date-time" })),
  dateTo: t.Optional(t.String({ format: "date-time" })),
  page: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  sortBy: t.Optional(t.String()),
  sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
  search: t.Optional(t.String()),
  shopId: t.Optional(t.Numeric())
};

// Following warehouse pattern - single query schema that handles all user types
const listOrdersQuerySchema = t.Object({
  ...listOrdersQueryBaseSchema,
  clientId: t.Optional(t.Numeric()), // For admin filtering by specific client
});

const deviceEligibilityQuerySchema = t.Object({
  imei: t.Optional(t.String()),
  serial: t.Optional(t.String())
});

// We no longer need custom setupAuth as we're using centralized authMiddleware

export const orderRoutes = new Elysia({ prefix: "/orders" })
  // Public endpoints - create order doesn't require auth
  .post("/", orderController.createOrder, {
    body: createOrderSchema.body,
    detail: { 
      summary: "Create a new buyback order", 
      description: "Allows a client or shop to create a new device buyback order, providing all necessary device, seller, and condition information.",
      tags: ["Orders"] 
    }
  })
  
  // Authenticated endpoints - following warehouse pattern
  .group("", (app) => app
    .use(requireRole([]))
    .get("/:orderId", orderController.getOrderById, {
      params: orderIdParamsSchema,
      detail: { 
        summary: "Get order details", 
        description: "Retrieves the full details of a specific buyback order by its unique ID. Access is controlled based on user role and shop permissions.",
        tags: ["Orders"] 
      }
    })
    .get("/", orderController.listOrders, {
      query: listOrdersQuerySchema,
      detail: { 
        summary: "List orders with role-based filtering", 
        description: "Retrieves a list of buyback orders. Access is filtered based on user role and shop permissions. Admin users can optionally filter by clientId. Supports filtering by status, date range, and pagination.",
        tags: ["Orders"] 
      }
    })
  )
  
  // Admin/ShopManager specific endpoints - following warehouse pattern
  .group("/admin", (app) => app
    .use(requireRole(['admin', 'shop_manager']))
    .post("/", orderController.createAdminOrder, {
      body: createAdminOrderSchema.body,
      detail: {
        summary: "Create a new buyback order as an Admin/Shop Manager",
        description: "Allows an admin or shop manager to create a new device buyback order directly, typically for in-store purchases. The order can be created with a 'PAID' status immediately. Client ID is determined based on user role.",
        tags: ["Admin", "ShopManager", "Orders"]
      }
    })
    .get("/:orderId", orderController.getOrderById, {
      params: orderIdParamsSchema,
      detail: { 
        summary: "Get order details (admin/shop manager)", 
        description: "Retrieves the full details of a specific buyback order by its unique ID. Shop managers can only access orders for their accessible shops. Admins can access any order.",
        tags: ["Admin", "ShopManager", "Orders"] 
      }
    })
    .put("/:orderId/status", orderController.updateOrderStatus, {
      body: updateOrderStatusSchema.body,
      params: updateOrderStatusSchema.params,
      detail: { 
        summary: "Update order status (admin/shop manager)", 
        description: "Allows an admin or shop manager to update the status of a buyback order (e.g., from 'Pending' to 'Received'). Shop managers can only update orders for their accessible shops. Can also include admin notes and the final assessed price if applicable.",
        tags: ["Admin", "ShopManager", "Orders"] 
      }
    })
    .get("/device-check", orderController.checkDeviceEligibility, {
      query: deviceEligibilityQuerySchema,
      detail: {
        summary: "Check device eligibility for purchase",
        description: "Checks if a device with the given IMEI or serial number is already in stock or has a paid order, preventing duplicate purchases.",
        tags: ["Admin", "ShopManager", "Orders"]
      }
    })
  ); 