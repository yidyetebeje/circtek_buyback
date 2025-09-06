import { Static, t } from "elysia";
import { roles } from "../../db/schema/user"; 
import { createInsertSchema, createSelectSchema } from "drizzle-typebox";

// Schema for inserting a new role, using drizzle-typebox
export const insertRoleSchema = createInsertSchema(roles, {
  // Override or add properties if needed, for example:
  // title: t.String({ minLength: 3, maxLength: 255 }),
  // slug: t.Optional(t.String({ maxLength: 255 })),
});
export type InsertRoleDTO = Static<typeof insertRoleSchema>;

// Schema for selecting a role, using drizzle-typebox
export const selectRoleSchema = createSelectSchema(roles);
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