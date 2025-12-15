import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { orderRoutes } from "./routes/orderRoutes";
import { storeTransferRoutes } from "./routes/storeTransferRoutes";

export const buybackApi = new Elysia({ prefix: "/buyback" })
  .use(swagger({
    documentation: {
      info: {
        title: "Buyback API",
        version: "1.0.0",
        description: "API for managing device buyback orders including creating orders, tracking shipping, and managing the order lifecycle"
      },
      tags: [
        { name: "Orders", description: "Device buyback order management endpoints" },
        { name: "Admin", description: "Admin-specific endpoints for order management" },
        { name: "Store Transfers", description: "Store to warehouse transfer endpoints" }
      ]
    }
  }))
  .use(orderRoutes)
  .use(storeTransferRoutes);

export default buybackApi; 