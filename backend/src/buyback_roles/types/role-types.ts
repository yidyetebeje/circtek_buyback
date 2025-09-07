import { Static, t } from "elysia";

// Schema for inserting a new role
export const insertRoleSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  description: t.String({ minLength: 1, maxLength: 500 }),
  status: t.Optional(t.Boolean({ default: true })),
});
export type InsertRoleDTO = Static<typeof insertRoleSchema>;

// Schema for selecting a role
export const selectRoleSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  description: t.String(),
  status: t.Nullable(t.Boolean()),
  created_at: t.Nullable(t.Date()),
  updated_at: t.Nullable(t.Date()),
});
export type SelectRoleDTO = Static<typeof selectRoleSchema>;

// Schema for role ID parameter
export const roleIdParamSchema = t.Object({
  id: t.Numeric({ minimum: 1, error: "Invalid role ID" }),
});
export type RoleIdParam = Static<typeof roleIdParamSchema>;

// Basic response schema
export const roleResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Union([selectRoleSchema, t.Array(selectRoleSchema), t.Null()])),
});
export type RoleResponse = Static<typeof roleResponseSchema>;

// Example for update, can be more specific
export const updateRoleSchema = t.Partial(insertRoleSchema);
export type UpdateRoleDTO = Static<typeof updateRoleSchema>; 