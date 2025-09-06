import { Elysia, t, NotFoundError, error, InternalServerError } from "elysia";
import { RoleService } from "../services/role-service";
import {
  insertRoleSchema,
  roleIdParamSchema,
  roleResponseSchema,
  updateRoleSchema,
  selectRoleSchema,
} from "../types/role-types";

export class RoleController {
  private roleService: RoleService;
  public readonly plugin: Elysia; // Store the Elysia instance

  constructor() {
    this.roleService = new RoleService();
    const app = new Elysia(); // Create an Elysia instance

    app.group("/roles", (group) =>
      group
        .decorate("roleService", this.roleService)
        .get(
          "/",
          async ({ roleService, set }) => {
            try {
              const roles = await roleService.getAllRoles();
              set.status = 200;
              return {
                success: true,
                message: "Roles retrieved successfully",
                data: roles,
              };
            } catch (e: any) {
              set.status = 500;
              return { success: false, message: e.message || "Internal server error", data: null };
            }
          },
          {
           
            detail: {
              summary: "Get all roles",
              description: "Retrieves a list of all available roles, excluding those that have been soft-deleted.",
              tags: ["Roles"],
            },
          }
        )
        .get(
          "/:id",
          async ({ params, roleService, set }) => {
            try {
              const role = await roleService.getRoleById(params.id);
              set.status = 200;
              return {
                success: true,
                message: "Role retrieved successfully",
                data: role,
              };
            } catch (e: any) {
              if (e instanceof NotFoundError) {
                set.status = 404;
              } else {
                set.status = 500;
              }
              return { success: false, message: e.message || "Error retrieving role", data: null };
            }
          },
          {
            params: roleIdParamSchema,
            
            detail: {
              summary: "Get a role by ID",
              description: "Retrieves the details of a specific role by its unique numeric ID. Returns a 404 error if the role is not found or has been soft-deleted.",
              tags: ["Roles"],
            },
          }
        )
        .post(
          "/",
          async ({ body, roleService, set }) => {
            try {
              const newRole = await roleService.createRole(body);
              set.status = 201;
              return {
                success: true,
                message: "Role created successfully",
                data: newRole,
              };
            } catch (e: any) {
              if (e.message?.includes("already exists")) {
                set.status = 409; // Conflict
              } else if (e.message?.includes("required")) { // Basic check for validation type errors from service
                set.status = 400; // Bad Request
              } else if (e instanceof InternalServerError) {
                set.status = 500;
              } else {
                set.status = 400; // Default to Bad Request for other creation errors
              }
              return { success: false, message: e.message || "Error creating role", data: null };
            }
          },
          {
            body: insertRoleSchema,
           
            detail: {
              summary: "Create a new role",
              description: "Creates a new role with a title and a unique slug. Other properties like status are set to default values. Timestamps (createdAt, updatedAt) are automatically managed.",
              tags: ["Roles"],
            },
          }
        )
        .put(
          "/:id",
          async ({ params, body, roleService, set }) => {
            try {
              const updatedRole = await roleService.updateRole(params.id, body);
              set.status = 200;
              return {
                success: true,
                message: "Role updated successfully",
                data: updatedRole,
              };
            } catch (e: any) {
              if (e instanceof NotFoundError) {
                set.status = 404;
              } else if (e.message?.includes("already exists")) {
                set.status = 409; // Conflict
              } else if (e instanceof InternalServerError) {
                set.status = 500;
              } else {
                set.status = 400; // Bad request for other errors (e.g. validation from service)
              }
              return { success: false, message: e.message || "Error updating role", data: null };
            }
          },
          {
            params: roleIdParamSchema,
            body: updateRoleSchema,
            
            detail: {
              summary: "Update an existing role",
              description: "Updates the details of an existing role identified by its ID. Allows modification of properties like title, slug, and status. The 'updatedAt' timestamp is automatically updated.",
              tags: ["Roles"],
            },
          }
        )
        .delete(
          "/:id",
          async ({ params, roleService, set }) => {
            try {
              const deletedRole = await roleService.deleteRole(params.id);
              set.status = 200;
              return {
                success: true,
                message: "Role deleted successfully (soft delete)",
                data: deletedRole,
              };
            } catch (e: any) {
              if (e instanceof NotFoundError) {
                set.status = 404;
              } else if (e instanceof InternalServerError) {
                set.status = 500;
              } else {
                set.status = 500; // Or a more specific error if identifiable
              }
              return { success: false, message: e.message || "Error deleting role", data: null };
            }
          },
          {
            params: roleIdParamSchema,
            
            detail: {
              summary: "Delete a role (soft delete)",
              description: "Soft deletes a role by setting its 'deletedAt' timestamp. The role is not permanently removed from the database but will be excluded from standard queries. Returns the role with the 'deletedAt' field populated.",
              tags: ["Roles"],
            },
          }
        )
    );
    this.plugin = app; // Assign the configured Elysia instance to the public property
  }
}
