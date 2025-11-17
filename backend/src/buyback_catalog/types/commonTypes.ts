import { t, TSchema, type Static } from 'elysia';

// Common pagination query parameters
export const PaginationQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 }))
});

// Standard response wrapper for paginated data
export const PaginatedResponseSchema = <T extends TSchema>(schema: T) => t.Object({
  data: t.Array(schema),
  meta: t.Object({
    total: t.Number(),
    page: t.Number(),
    limit: t.Number(),
    totalPages: t.Number()
  })
});

// Client ID parameter for filtering by client
export const TenantIdQuerySchema = t.Object({
  tenantId: t.Optional(t.Numeric({ minimum: 1 }))
});

// Standard success response
export const SuccessResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String()
});

// Standard error response
export const ErrorResponseSchema = t.Object({
  error: t.Object({
    message: t.String(),
    code: t.Optional(t.String())
  })
});

// Static types
export type TPaginationQuery = Static<typeof PaginationQuerySchema>;
export type TTenantIdQuery = Static<typeof TenantIdQuerySchema>;
export type TSuccessResponse = Static<typeof SuccessResponseSchema>;
export type TErrorResponse = Static<typeof ErrorResponseSchema>;
