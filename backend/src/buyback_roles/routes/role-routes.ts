import { Elysia } from "elysia";
import { RoleController } from "../controllers/role-controller";
import { authMiddleware } from "@/middleware/auth";

const roleController = new RoleController();

// Apply authentication middleware to protect role routes
// Use different auth middleware based on requirements
export const roleRoutes = new Elysia()
  .use(authMiddleware.isAuthenticated) // Basic auth check for all routes
  .use(authMiddleware.isAdmin) // Additionally require admin role
  .use(roleController.plugin); 