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
  async getTemplates(
    ctx: Context & { 
      query: { 
        page?: string; 
        limit?: string; 
        search?: string; 
        templateType?: string; 
        isActive?: string; 
      };
      user?: { shopId: number };
    }
  ) {
    try {
      const { page = "1", limit = "20", search, templateType, isActive } = ctx.query;
      // Use shopId from user context or default to 1 for testing
      const shopId = ctx.user?.shopId || 1;

      const query: EmailTemplateListQuery = {
        offset: (parseInt(page) - 1) * parseInt(limit),
        limit: parseInt(limit),
        search: search || undefined,
        templateType: templateType as any || undefined,
        isActive: isActive ? isActive === "true" : undefined,
      };

      const result = await emailTemplateService.getTemplates(shopId, query);

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
    } catch (error) {
      console.error("Error fetching email templates:", error);
      ctx.set.status = 500;
      return {
        success: false,
        message: "Failed to fetch email templates"
      };
    }
  }

  /**
   * Get a specific email template
   */
  async getTemplate(
    ctx: Context & { 
      params: { id: string };
      user?: { shopId: number };
    }
  ) {
    try {
      const { id } = ctx.params;
      const shopId = ctx.user?.shopId || 1;

      const template = await emailTemplateService.getTemplateById(id, shopId);

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
    } catch (error) {
      console.error("Error fetching email template:", error);
      ctx.set.status = 500;
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
      body: EmailTemplateCreateRequest;
      user?: { shopId: number };
    }
  ) {
    try {
      const shopId = ctx.user?.shopId || 1;
      const template = await emailTemplateService.createTemplate(shopId, ctx.body);

      ctx.set.status = 201;
      return {
        success: true,
        data: template,
        message: "Email template created successfully"
      };
    } catch (error) {
      console.error("Error creating email template:", error);
      ctx.set.status = 500;
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
      body: Partial<EmailTemplateCreateRequest>;
      user?: { shopId: number };
    }
  ) {
    try {
      const { id } = ctx.params;
      const shopId = ctx.user?.shopId || 1;

      const template = await emailTemplateService.updateTemplate(
        id, 
        shopId, 
        { ...ctx.body, id }
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
    } catch (error) {
      console.error("Error updating email template:", error);
      ctx.set.status = 500;
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
      user?: { shopId: number };
    }
  ) {
    try {
      const { id } = ctx.params;
      const shopId = ctx.user?.shopId || 1;

      const success = await emailTemplateService.deleteTemplate(id, shopId);

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
    } catch (error) {
      console.error("Error deleting email template:", error);
      ctx.set.status = 500;
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
      body: EmailTemplatePopulateRequest;
      user?: { shopId: number };
    }
  ) {
    try {
      const shopId = ctx.user?.shopId || 1;
      
      // Debug logging
     
        templateId: ctx.body.templateId,
        orderId: ctx.body.orderId,
        hasSubject: !!ctx.body.subject,
        hasContent: !!ctx.body.content,
        shopId
      });
      
      const result = await emailTemplateService.populateTemplate(ctx.body, shopId);

      if (!result) {
       
        ctx.set.status = 404;
        return {
          success: false,
          message: "Template or order not found"
        };
      }

     
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error("Error populating template:", error);
      ctx.set.status = 500;
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
      user?: { shopId: number };
    }
  ) {
    try {
      const shopId = ctx.user?.shopId || 1;
      const templates = await emailTemplateService.createSampleTemplates(shopId);

      ctx.set.status = 201;
      return {
        success: true,
        data: templates,
        message: `Created ${templates.length} sample email templates successfully`
      };
    } catch (error) {
      console.error("Error creating sample templates:", error);
      ctx.set.status = 500;
      return {
        success: false,
        message: "Failed to create sample templates"
      };
    }
  }
}

export const emailTemplateController = new EmailTemplateController(); 