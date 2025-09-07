import { t } from 'elysia';
import type { Static } from 'elysia';

// Schema for requesting to create a new user with a role
export const createUserWithRoleSchema = t.Object({
  fName: t.String({ minLength: 1, maxLength: 255 }),
  lName: t.String({ minLength: 1, maxLength: 255 }),
  userName: t.String({ minLength: 3, maxLength: 255 }),
  email: t.String({ format: 'email', maxLength: 255 }),
  password: t.String({ minLength: 8, maxLength: 255 }),
  roleSlug: t.String({ minLength: 1, maxLength: 255 }), 
  warehouseId: t.Optional(t.Numeric({ default: 0 })),
  organizationName: t.Optional(t.String({ maxLength: 255 })),
  managed_shop_id: t.Optional(t.Numeric()), // Added for shop_manager role
});

// Schema for updating user's role
export const updateUserRoleSchema = t.Object({
  roleSlug: t.String({ minLength: 1, maxLength: 255 }),
});

// Schema for updating user information
export const updateUserSchema = t.Object({
  fName: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  lName: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  userName: t.Optional(t.String({ minLength: 3, maxLength: 255 })),
  email: t.Optional(t.String({ format: 'email', maxLength: 255 })),
  password: t.Optional(t.String({ minLength: 8, maxLength: 255 })),
  roleSlug: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  status: t.Optional(t.Boolean()),
  clientId: t.Optional(t.Numeric()),
  warehouseId: t.Optional(t.Numeric()),
  organizationName: t.Optional(t.String({ maxLength: 255 })),
  managed_shop_id: t.Optional(t.Nullable(t.Numeric())),
});

// Schema for user ID parameter
export const userIdParamSchema = t.Object({
  id: t.Numeric(),
});

// Response schema for user with role operations
export const userWithRoleResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Object({
    id: t.Number(),
    fName: t.String(),
    lName: t.String(),
    userName: t.String(),
    email: t.String(),
    roleName: t.Nullable(t.String()),
    roleSlug: t.Nullable(t.String()),
  })),
});

// Response schema for full user update operations
export const userUpdateResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Object({
    id: t.Number(),
    fName: t.String(),
    lName: t.String(),
    userName: t.String(),
    email: t.String(),
    status: t.Boolean(),
    roleId: t.Number(),
    roleName: t.String(),
    roleSlug: t.String(),
    clientId: t.Optional(t.Numeric()),
    warehouseId: t.Optional(t.Numeric()),
    organizationName: t.Optional(t.String()),
    managed_shop_id: t.Optional(t.Nullable(t.Numeric())),
  })),
});

// DTOs for service layer
export type CreateUserWithRoleDTO = Static<typeof createUserWithRoleSchema>;
export type UpdateUserRoleDTO = Static<typeof updateUserRoleSchema>;
export type UpdateUserDTO = Static<typeof updateUserSchema>;

// Schema for list users query parameters
export const listUsersQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 10 })),
  sortBy: t.Optional(t.String({ default: 'createdAt' })),
  sortOrder: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'desc' })),
  search: t.Optional(t.String()),
  roleId: t.Optional(t.Numeric()),
  roleSlug: t.Optional(t.String()), // Added roleSlug filtering support
  roleName: t.Optional(t.String()), // Added roleName filtering support
  status: t.Optional(t.Boolean()), // This was previously t.Nullable(t.Boolean()) in userListItemSchema, ensuring consistency or specific use. For query, boolean is fine.
  clientId: t.Optional(t.Numeric()), 
  tenantId: t.Optional(t.Numeric()), // Added tenantId filtering support
  shopId: t.Optional(t.Numeric()),
});

// Individual user data for the list response
const userListItemSchema = t.Object({
  id: t.Number(),
  fName: t.Nullable(t.String()),
  lName: t.Nullable(t.String()),
  userName: t.Nullable(t.String()),
  email: t.Nullable(t.String()),
  status: t.Nullable(t.Boolean()), // Allowing null as status can be null in DB or join
  createdAt: t.Nullable(t.String()),
  updatedAt: t.Nullable(t.String()),
  organizationName: t.Nullable(t.String()),
  role: t.Optional(t.Nullable(t.Object({
    id: t.Number(),
    title: t.String(),
  }))),
});

// Schema for paginated list of users response
export const paginatedUsersResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Array(userListItemSchema),
  meta: t.Object({
    total: t.Number(),
    page: t.Number(),
    limit: t.Number(),
    totalPages: t.Number(),
  }),
});

// DTO for list users query params
export type ListUsersQueryDTO = Static<typeof listUsersQuerySchema>; 