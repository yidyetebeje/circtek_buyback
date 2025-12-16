import { Context } from "elysia";
import { emailTemplateService } from "../services/email-template-service";
import {
  EmailTemplateCreateRequest,
  EmailTemplateUpdateRequest,
  EmailTemplateListQuery,
  EmailTemplatePopulateRequest
} from "../types";

export class EmailTemplateController {
  /**
   * Get all email templates for a shop
   */
  async getTemplates(ctx: any) {
    try {
      const { page = "1", limit = "20", search, templateType, isActive, shopId } = ctx.query;
      const { currentTenantId } = ctx as any;
      const tenantId = Number(currentTenantId);

      if (!shopId) {
        ctx.set.status = 400;
        return { success: false, message: "shopId is required" };
      }

      if (!tenantId) {
        ctx.set.status = 401;
        return { success: false, message: "Unauthorized" };
      }

      const query: EmailTemplateListQuery = {
        offset: (parseInt(page) - 1) * parseInt(limit),
        limit: parseInt(limit),
        search: search || undefined,
        templateType: templateType as any || undefined,
        isActive: isActive ? isActive === "true" : undefined,
      };

      const result = await emailTemplateService.getTemplates(parseInt(shopId), tenantId, query);

      return {
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(result.total / parseInt(limit))
        }
      };
    } catch (error: any) {
      console.error("Error fetching email templates:", error);
      ctx.set.status = error.message === "Invalid shop access" ? 403 : 500;
      return {
        success: false,
        message: error.message || "Failed to fetch email templates"
      };
    }
  }

  /**
   * Get a specific email template
   */
  async getTemplate(
    ctx: Context & {
      params: { id: string };
      query: { shopId: string };
      user?: { shopId: number; currentTenantId: number };
    }
  ) {
    try {
      const { id } = ctx.params;
      const { shopId } = ctx.query;
      const { currentTenantId } = ctx as any;
      const tenantId = Number(currentTenantId);

      if (!shopId) {
        ctx.set.status = 400;
        return { success: false, message: "shopId is required" };
      }

      if (!tenantId) {
        ctx.set.status = 401;
        return { success: false, message: "Unauthorized" };
      }

      const template = await emailTemplateService.getTemplateById(id, parseInt(shopId), tenantId);

      if (!template) {
        ctx.set.status = 404;
        return {
          success: false,
          message: "Email template not found"
        };
      }

      return {
        success: true,
        data: template
      };
    } catch (error: any) {
      console.error("Error fetching email template:", error);
      ctx.set.status = error.message === "Invalid shop access" ? 403 : 500;
      return {
        success: false,
        message: "Failed to fetch email template"
      };
    }
  }

  /**
   * Create a new email template
   */
  async createTemplate(
    ctx: Context & {
      body: EmailTemplateCreateRequest & { shopId: number };
      user?: { shopId: number; currentTenantId: number };
    }
  ) {
    try {
      // shopId is in body as number (from schema validation)
      const { shopId, ...data } = ctx.body;
      const { currentTenantId } = ctx as any;
      const tenantId = Number(currentTenantId);

      if (!shopId) {
        ctx.set.status = 400;
        return { success: false, message: "shopId is required" };
      }

      if (!tenantId) {
        ctx.set.status = 401;
        return { success: false, message: "Unauthorized" };
      }

      const template = await emailTemplateService.createTemplate(shopId, tenantId, data);

      ctx.set.status = 201;
      return {
        success: true,
        data: template,
        message: "Email template created successfully"
      };
    } catch (error: any) {
      console.error("Error creating email template:", error);
      ctx.set.status = error.message === "Invalid shop access" ? 403 : 500;
      return {
        success: false,
        message: "Failed to create email template"
      };
    }
  }

  /**
   * Update an existing email template
   */
  async updateTemplate(
    ctx: Context & {
      params: { id: string };
      body: Partial<EmailTemplateCreateRequest> & { shopId: number };
      user?: { shopId: number; currentTenantId: number };
    }
  ) {
    try {
      const { id } = ctx.params;
      const { shopId, ...data } = ctx.body;
      const { currentTenantId } = ctx as any;
      const tenantId = Number(currentTenantId);

      if (!shopId) {
        ctx.set.status = 400;
        return { success: false, message: "shopId is required" };
      }

      if (!tenantId) {
        ctx.set.status = 401;
        return { success: false, message: "Unauthorized" };
      }

      const template = await emailTemplateService.updateTemplate(
        id,
        shopId,
        tenantId,
        { ...data, id }
      );

      if (!template) {
        ctx.set.status = 404;
        return {
          success: false,
          message: "Email template not found"
        };
      }

      return {
        success: true,
        data: template,
        message: "Email template updated successfully"
      };
    } catch (error: any) {
      console.error("Error updating email template:", error);
      ctx.set.status = error.message === "Invalid shop access" ? 403 : 500;
      return {
        success: false,
        message: "Failed to update email template"
      };
    }
  }

  /**
   * Delete an email template
   */
  async deleteTemplate(
    ctx: Context & {
      params: { id: string };
      query: { shopId: string };
      user?: { shopId: number; currentTenantId: number };
    }
  ) {
    try {
      const { id } = ctx.params;
      const { shopId } = ctx.query;
      const { currentTenantId } = ctx as any;
      const tenantId = Number(currentTenantId);

      if (!shopId) {
        ctx.set.status = 400;
        return { success: false, message: "shopId is required" };
      }

      if (!tenantId) {
        ctx.set.status = 401;
        return { success: false, message: "Unauthorized" };
      }

      const success = await emailTemplateService.deleteTemplate(id, parseInt(shopId), tenantId);

      if (!success) {
        ctx.set.status = 404;
        return {
          success: false,
          message: "Email template not found"
        };
      }

      return {
        success: true,
        data: { success: true },
        message: "Email template deleted successfully"
      };
    } catch (error: any) {
      console.error("Error deleting email template:", error);
      ctx.set.status = error.message === "Invalid shop access" ? 403 : 500;
      return {
        success: false,
        message: "Failed to delete email template"
      };
    }
  }

  /**
   * Get available dynamic fields
   */
  async getDynamicFields(ctx: Context) {
    try {
      const fields = await emailTemplateService.getDynamicFields();
      return {
        success: true,
        data: fields.data
      };
    } catch (error) {
      console.error("Error fetching dynamic fields:", error);
      ctx.set.status = 500;
      return {
        success: false,
        message: "Failed to fetch dynamic fields"
      };
    }
  }

  /**
   * Populate template with order data (for preview)
   */
  async populateTemplate(
    ctx: Context & {
      body: EmailTemplatePopulateRequest & { shopId: number };
      user?: { shopId: number; currentTenantId: number };
    }
  ) {
    try {
      const { shopId } = ctx.body;
      const { currentTenantId } = ctx as any;
      const tenantId = Number(currentTenantId);

      if (!shopId) {
        ctx.set.status = 400;
        return { success: false, message: "shopId is required" };
      }

      if (!tenantId) {
        ctx.set.status = 401;
        return { success: false, message: "Unauthorized" };
      }

      // Debug logging
      console.log("Populate template request:", {
        templateId: ctx.body.templateId,
        orderId: ctx.body.orderId,
        hasSubject: !!ctx.body.subject,
        hasContent: !!ctx.body.content,
        shopId
      });

      const result = await emailTemplateService.populateTemplate(ctx.body, shopId, tenantId);

      if (!result) {
        console.log("No result returned from service");
        ctx.set.status = 404;
        return {
          success: false,
          message: "Template or order not found"
        };
      }

      console.log("Preview generated successfully");
      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error("Error populating template:", error);
      ctx.set.status = error.message === "Invalid shop access" ? 403 : 500;
      return {
        success: false,
        message: "Failed to populate template"
      };
    }
  }

  /**
   * Create sample email templates for testing and demonstration
   */
  async createSampleTemplates(
    ctx: Context & {
      body: { shopId: number };
      user?: { shopId: number; currentTenantId: number };
    }
  ) {
    try {
      const { shopId } = ctx.body;
      const { currentTenantId } = ctx as any;
      const tenantId = Number(currentTenantId);

      if (!shopId) {
        ctx.set.status = 400;
        return { success: false, message: "shopId is required" };
      }

      if (!tenantId) {
        ctx.set.status = 401;
        return { success: false, message: "Unauthorized" };
      }

      const templates = await emailTemplateService.createSampleTemplates(shopId, tenantId);

      ctx.set.status = 201;
      return {
        success: true,
        data: templates,
        message: `Created ${templates.length} sample email templates successfully`
      };
    } catch (error: any) {
      console.error("Error creating sample templates:", error);
      ctx.set.status = error.message === "Invalid shop access" ? 403 : 500;
      return {
        success: false,
        message: "Failed to create sample templates"
      };
    }
  }
}

export const emailTemplateController = new EmailTemplateController();