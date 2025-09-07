import { Elysia } from "elysia";
import { RoleController } from "../controllers/role-controller";
import {requireRole} from "../../auth";

const roleController = new RoleController();
export const roleRoutes = new Elysia()
  .use(requireRole(['admin']))
  .use(roleController.plugin); 