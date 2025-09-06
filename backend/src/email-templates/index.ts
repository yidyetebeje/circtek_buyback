import { Elysia } from "elysia";
import { emailTemplateRoutes } from "./routes/email-template-routes";

export const emailTemplatesModule = new Elysia()
  .use(emailTemplateRoutes);

// Re-export types and services for external use
export * from "./types";
export * from "./services/email-template-service";
export * from "./repository/email-template-repository"; 