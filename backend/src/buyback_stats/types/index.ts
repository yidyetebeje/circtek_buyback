import { t } from "elysia";

export const DateRangeQuerySchema = t.Object({
  dateFrom: t.Optional(t.String({ format: "date-time", description: "Start date for filtering (ISO8601)" })),
  dateTo: t.Optional(t.String({ format: "date-time", description: "End date for filtering (ISO8601)" }))
});

export const LimitQuerySchema = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, default: 10, description: "Number of items to return" }))
});

// --- Platform Overview ---
export const PlatformOverviewSuccessResponseSchema = t.Object({
  totalOrders: t.Number(),
  ordersByStatus: t.Record(t.String(), t.Number()),
  totalEstimatedValue: t.Number(),
  totalFinalValue: t.Number(),
  averageEstimatedOrderValue: t.Number(),
  averageFinalOrderValue: t.Number(),
  timeSeries: t.Optional(t.Object({
    daily: t.Array(t.Object({
      date: t.String(),
      orderCount: t.Number(),
      totalValue: t.Number()
    })),
    weekly: t.Array(t.Object({
      week: t.String(),
      orderCount: t.Number(),
      totalValue: t.Number()
    }))
  }))
});

// --- Top Devices ---
export const TopDevicesQuerySchema = t.Object({
  dateFrom: t.Optional(t.String({ format: "date-time", description: "Start date for filtering (ISO8601)" })),
  dateTo: t.Optional(t.String({ format: "date-time", description: "End date for filtering (ISO8601)" })),
  limit: t.Optional(t.Numeric({ minimum: 1, default: 10, description: "Number of items to return" })),
  sortBy: t.Optional(t.Enum({ count: "count", finalValue: "finalValue" }, { default: "count", description: "Sort by order count or total final value" }))
});

export const TopDeviceItemSchema = t.Object({
  deviceId: t.Number(), // Assuming models.id is number, based on schema
  modelName: t.String(),
  brandName: t.Optional(t.String()), // Assuming brand can be joined
  seriesName: t.Optional(t.String()), // Assuming series can be joined
  orderCount: t.Number(),
  totalFinalValue: t.Number()
});

export const TopDevicesSuccessResponseSchema = t.Object({
  topDevices: t.Array(TopDeviceItemSchema)
});

// --- Top Shops ---
export const TopShopsQuerySchema = t.Object({
  dateFrom: t.Optional(t.String({ format: "date-time", description: "Start date for filtering (ISO8601)" })),
  dateTo: t.Optional(t.String({ format: "date-time", description: "End date for filtering (ISO8601)" })),
  limit: t.Optional(t.Numeric({ minimum: 1, default: 10, description: "Number of items to return" })),
  sortBy: t.Optional(t.Enum({ orderCount: "orderCount", totalFinalValue: "totalFinalValue" }, { default: "orderCount", description: "Sort by order count or total final value" }))
});

export const TopShopItemSchema = t.Object({
  shopId: t.Number(), // Assuming shops.id is number
  shopName: t.String(),
  orderCount: t.Number(),
  totalFinalValue: t.Number()
});

export const TopShopsSuccessResponseSchema = t.Object({
  topShops: t.Array(TopShopItemSchema)
});

// --- Shop-Specific Overview ---
export const ShopIdParamsSchema = t.Object({
  shopId: t.Numeric({ description: "Shop ID (numeric)", minimum:1 }) // Changed to t.Numeric
});

// Reusing PlatformOverviewSuccessResponseSchema but adding shop context
export const ShopOverviewSuccessResponseSchema = t.Intersect([
  t.Object({
    shopId: t.Union([t.Number(), t.String()]), // Accommodate current int or future UUID
    shopName: t.String()
  }),
  PlatformOverviewSuccessResponseSchema
]);


// --- Shop-Specific Top Devices ---
// Reusing TopDevicesSuccessResponseSchema but adding shop context
export const ShopTopDevicesSuccessResponseSchema = t.Intersect([
  t.Object({
    shopId: t.Union([t.Number(), t.String()]),
    shopName: t.String()
  }),
  TopDevicesSuccessResponseSchema
]);

// General Error Schemas (can be expanded)
export const ErrorResponseSchema = t.Object({
  error: t.String(),
  details: t.Optional(t.String())
});

export const UnauthorizedErrorSchema = t.Object({
  message: t.String()
});

export const ForbiddenErrorSchema = t.Object({
  message: t.String()
});

export const NotFoundErrorSchema = t.Object({
  message: t.String()
});

// --- Time Series ---
export const TimeSeriesQuerySchema = t.Object({
  dateFrom: t.String({ format: "date-time", description: "Start date for time series (ISO8601)" }),
  dateTo: t.String({ format: "date-time", description: "End date for time series (ISO8601)" }),
  period: t.Enum({ daily: "daily", weekly: "weekly", monthly: "monthly" }, { default: "daily", description: "Time period grouping" })
});

export const TimeSeriesDataPointSchema = t.Object({
  period: t.String({ description: "Time period identifier (e.g., '2024-01-15', '2024-03', '2024-12')" }),
  orderCount: t.Number({ description: "Total orders in this period" }),
  totalEstimatedValue: t.Number({ description: "Total estimated value in this period" }),
  totalFinalValue: t.Number({ description: "Total final value in this period" }),
  paidOrders: t.Number({ description: "Number of paid orders" }),
  pendingOrders: t.Number({ description: "Number of pending orders" }),
  arrivedOrders: t.Number({ description: "Number of arrived orders" }),
  rejectedOrders: t.Number({ description: "Number of rejected orders" })
});

export const PlatformTimeSeriesResponseSchema = t.Object({
  timeSeries: t.Array(TimeSeriesDataPointSchema)
});

export const ShopTimeSeriesResponseSchema = t.Intersect([
  t.Object({
    shopId: t.Union([t.Number(), t.String()]),
    shopName: t.String()
  }),
  PlatformTimeSeriesResponseSchema
]);

// For JWT user payload, adjust as per your actual JWT structure
export const AuthenticatedUserSchema = t.Object({
    id: t.Number(), // or string, depending on user ID type
    // Add other relevant user properties from JWT, e.g. role, shopId if applicable
    role: t.Optional(t.String()), 
    roleSlug: t.String(),
    shopId: t.Optional(t.Number()) // If shop client's shopId is in JWT
}); 