import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { roleRoutes } from "./routes/role-routes";
import { userRoutes } from "./routes/user-routes";

export const rolesApi = new Elysia({ prefix: "/roles-management" }) // Changed prefix to avoid conflict if main group is /roles
  .use(swagger({
    documentation: {
      info: {
        title: "Roles Management API",
        version: "1.0.0",
        description: "API for managing user roles"
      },
      tags: [
        { name: "Roles", description: "User role management endpoints" },
        { name: "Users", description: "User management endpoints with roles" }
      ]
    }
  }))
  .use(roleRoutes)
  .use(userRoutes);

export default rolesApi; 