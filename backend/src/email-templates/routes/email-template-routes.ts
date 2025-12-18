import { Elysia, t } from "elysia";
import { emailTemplateController } from "../controllers/email-template-controller";
import { EMAIL_TEMPLATE_TYPE } from "../types";
import { requireRole } from "../../auth";

// Get template type values for validation
const templateTypeValues = Object.values(EMAIL_TEMPLATE_TYPE) as [string, ...string[]];

export const emailTemplateRoutes = new Elysia({ prefix: "/email-templates" })
  .use(requireRole([])) // Add centralized authentication middleware

  // Get all templates
  .get("/", emailTemplateController.getTemplates, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String()),
      templateType: t.Optional(t.String()),
      isActive: t.Optional(t.String()),
      shopId: t.String({ description: "Shop ID" })
    }),
    detail: {
      summary: "Get email templates",
      description: "Get paginated list of email templates for the shop",
      tags: ["Email Templates"]
    }
  })

  // Static routes MUST come before dynamic /:id routes
  // Get dynamic fields
  .get("/dynamic-fields", emailTemplateController.getDynamicFields, {
    detail: {
      summary: "Get dynamic fields",
      description: "Get available dynamic fields for email templates",
      tags: ["Email Templates"]
    }
  })

  // Populate template (preview)
  .post("/populate", emailTemplateController.populateTemplate, {
    body: t.Object({
      templateId: t.String({ description: "Template ID" }),
      orderId: t.String({ description: "Order ID" }),
      subject: t.Optional(t.String({ description: "Template subject for preview" })),
      content: t.Optional(t.String({ description: "Template content for preview" })),
      shopId: t.Number({ description: "Shop ID" })
    }),
    detail: {
      summary: "Populate template",
      description: "Populate template with order data for preview",
      tags: ["Email Templates"]
    }
  })

  // Create sample templates
  .post("/samples", emailTemplateController.createSampleTemplates, {
    body: t.Object({
      shopId: t.Number({ description: "Shop ID" })
    }),
    detail: {
      summary: "Create sample templates",
      description: "Create sample email templates for testing and demonstration",
      tags: ["Email Templates"]
    }
  })

  // Dynamic routes with :id parameter come after static routes
  // Get specific template
  .get("/:id", emailTemplateController.getTemplate, {
    params: t.Object({
      id: t.String({ description: "Template ID" })
    }),
    query: t.Object({
      shopId: t.String({ description: "Shop ID" })
    }),
    detail: {
      summary: "Get email template",
      description: "Get a specific email template by ID",
      tags: ["Email Templates"]
    }
  })

  // Create new template
  .post("/", emailTemplateController.createTemplate, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      subject: t.String({ minLength: 1, maxLength: 500 }),
      content: t.String({ minLength: 1 }),
      templateType: t.Union(templateTypeValues.map(val => t.Literal(val))),
      isActive: t.Optional(t.Boolean()),
      shopId: t.Number({ description: "Shop ID" })
    }),
    detail: {
      summary: "Create email template",
      description: "Create a new email template",
      tags: ["Email Templates"]
    }
  })

  // Update template
  .put("/:id", emailTemplateController.updateTemplate, {
    params: t.Object({
      id: t.String({ description: "Template ID" })
    }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      subject: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
      content: t.Optional(t.String({ minLength: 1 })),
      templateType: t.Optional(t.Union(templateTypeValues.map(val => t.Literal(val)))),
      isActive: t.Optional(t.Boolean()),
      shopId: t.Number({ description: "Shop ID" })
    }),
    detail: {
      summary: "Update email template",
      description: "Update an existing email template",
      tags: ["Email Templates"]
    }
  })

  // Delete template
  .delete("/:id", emailTemplateController.deleteTemplate, {
    params: t.Object({
      id: t.String({ description: "Template ID" })
    }),
    query: t.Object({
      shopId: t.String({ description: "Shop ID" })
    }),
    detail: {
      summary: "Delete email template",
      description: "Delete an email template",
      tags: ["Email Templates"]
    }
  }); 