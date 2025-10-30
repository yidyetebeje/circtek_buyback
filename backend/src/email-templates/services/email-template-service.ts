import { EmailTemplateRepository } from "../repository/email-template-repository";
import { 
  EmailTemplate,
  EmailTemplateCreateRequest, 
  EmailTemplateUpdateRequest, 
  EmailTemplateListQuery,
  EmailTemplatePopulateRequest,
  EmailTemplatePopulatedResponse,
  EMAIL_TEMPLATE_TYPE
} from "../types";
import { db } from "../../db";
import { orders } from "../../db/order.schema";
import { shipping_details } from "../../db/order.schema";
import { models } from "../../db/buyback_catalogue.schema";
import { shops } from "../../db/shops.schema";
import { users } from "../../db/circtek.schema";

import { eq, and } from "drizzle-orm";

export class EmailTemplateService {
  private repository: EmailTemplateRepository;

  constructor() {
    this.repository = new EmailTemplateRepository();
  }

  /**
   * Get paginated list of email templates
   */
  async getTemplates(shopId: number, query: EmailTemplateListQuery = {}) {
    return this.repository.findMany({ ...query, shopId });
  }

  /**
   * Get a specific email template by ID
   */
  async getTemplateById(id: string, shopId: number) {
    const template = await this.repository.findById(id);
    if (!template || template.shopId !== shopId) {
      return null;
    }
    return template;
  }

  /**
   * Create a new email template
   */
  async createTemplate(shopId: number, data: EmailTemplateCreateRequest) {
    return this.repository.create({
      ...data,
      shopId,
      isActive: data.isActive ? 1 : 0
    });
  }

  /**
   * Update an existing email template
   */
  async updateTemplate(id: string, shopId: number, data: EmailTemplateUpdateRequest) {
    const existing = await this.repository.findById(id);
    if (!existing || existing.shopId !== shopId) {
      return null;
    }

    const updateData: any = { ...data };
    delete updateData.id;
    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive ? 1 : 0;
    }

    return this.repository.update(id, updateData);
  }

  /**
   * Delete an email template
   */
  async deleteTemplate(id: string, shopId: number): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing || existing.shopId !== shopId) {
      return false;
    }

    await this.repository.delete(id);
    return true;
  }

  /**
   * Get available dynamic fields grouped by category
   */
  async getDynamicFields() {
    return this.repository.getDynamicFields();
  }

  /**
   * Populate a template with actual order data
   */
  async populateTemplate(request: EmailTemplatePopulateRequest, shopId: number): Promise<EmailTemplatePopulatedResponse | null> {
   
      templateId: request.templateId,
      orderId: request.orderId,
      hasSubject: !!request.subject,
      hasContent: !!request.content,
      shopId
    });
    
    // Check if this is a preview request (orderId starts with 'preview-' or 'mock-')
    const isPreview = request.orderId.startsWith('preview-') || request.orderId.startsWith('mock-');
   
    
    let template;
    
    // Handle preview templates that might not exist in database yet
    if (request.templateId === 'preview-template' && (request.subject || request.content)) {
     
      // Use the provided subject and content for preview (use defaults if empty)
      template = {
        id: 'preview-template',
        subject: request.subject || 'Preview Subject',
        content: request.content || 'Preview Content',
        templateType: 'CUSTOM', // Default type for preview
        shopId
      };
    } else if (request.templateId === 'preview-template') {
     
        hasSubject: !!request.subject, 
        hasContent: !!request.content,
        subjectValue: request.subject,
        contentValue: request.content
      });
      return null;
    } else {
     
      // Get existing template from database
      template = await this.repository.findById(request.templateId);
      if (!template || template.shopId !== shopId) {
       
        return null;
      }
    }
    
    let orderData;
    if (isPreview) {
      // Generate mock order data for preview
      orderData = this.generateMockOrderData(shopId, template.templateType);
    } else {
      // Get real order data
      orderData = await this.getOrderData(request.orderId);
      if (!orderData) {
        return null;
      }
    }

    const populatedFields = this.extractFieldData(orderData);
    const populatedSubject = this.replacePlaceholders(template.subject, populatedFields);
    const populatedContent = this.replacePlaceholders(template.content, populatedFields);

    return {
      subject: populatedSubject,
      content: populatedContent,
      populatedFields
    };
  }

  /**
   * Generate mock order data for preview purposes
   */
  private generateMockOrderData(shopId: number, templateType?: string) {
    const now = new Date();
    const orderNumber = `ORD-${Date.now()}`;
    
    // Generate different mock data based on template type
    const mockData = {
      orderId: `mock-${Date.now()}`,
      orderNumber,
      status: this.getMockStatusForTemplateType(templateType),
      estimatedPrice: "299.99",
      finalPrice: "275.50",
      sellerNotes: "Device is in excellent condition, minimal wear on corners.",
      adminNotes: "Inspection completed. Minor scratches noted on back panel.",
      createdAt: now,
      updatedAt: now,
      deviceSnapshot: {
        modelName: "iPhone 14 Pro",
        brandName: "Apple",
        categoryName: "Smartphones",
        storage: "256GB",
        color: "Deep Purple",
        condition: "Good"
      },
      
      // Shop fields
      shopId,
      shopName: "TechBuyback Amsterdam",
      shopPhone: "+31 20 123 4567",
      
      // Model fields
      modelId: 1,
      modelTitle: "iPhone 14 Pro",
      
      // Shipping fields
      shippingId: `ship-${Date.now()}`,
      sellerName: "John van der Berg",
      sellerEmail: "john.vandenberg@example.com",
      sellerPhoneNumber: "+31 6 12345678",
      trackingNumber: "1Z999AA1234567890",
      shippingProvider: "DHL",
    };

    return mockData;
  }

  /**
   * Get appropriate mock status based on template type
   */
  private getMockStatusForTemplateType(templateType?: string): string {
    switch (templateType) {
      case 'ORDER_CONFIRMATION':
        return 'PENDING_SHIPMENT';
      case 'SHIPMENT_RECEIVED':
        return 'RECEIVED_BY_ADMIN';
      case 'INSPECTION_COMPLETED':
        return 'INSPECTION_COMPLETED';
      case 'OFFER_ACCEPTED':
        return 'OFFER_ACCEPTED';
      case 'OFFER_REJECTED':
        return 'OFFER_REJECTED';
      case 'ORDER_COMPLETED':
        return 'COMPLETED';
      case 'ORDER_CANCELLED':
        return 'CANCELLED';
      default:
        return 'PENDING_SHIPMENT';
    }
  }

  /**
   * Get comprehensive order data for template population
   */
  private async getOrderData(orderId: string) {
    const result = await db
      .select({
        // Order fields
        orderId: orders.id,
        orderNumber: orders.order_number,
        status: orders.status,
        estimatedPrice: orders.estimated_price,
        finalPrice: orders.final_price,
        sellerNotes: orders.seller_notes,
        adminNotes: orders.admin_notes,
        createdAt: orders.created_at,
        updatedAt: orders.updated_at,
        deviceSnapshot: orders.device_snapshot,
        
        // Shop fields
        shopId: shops.id,
        shopName: shops.name,
        shopPhone: shops.phone,
        
        // Model fields
        modelId: models.id,
        modelTitle: models.title,
        
        // Shipping fields
        shippingId: shipping_details.id,
        sellerName: shipping_details.sellerName,
        sellerEmail: shipping_details.seller_email,
        sellerPhoneNumber: shipping_details.seller_phone_number,
        trackingNumber: shipping_details.tracking_number,
        shippingProvider: shipping_details.shipping_provider,
      })
      .from(orders)
      .leftJoin(shops, eq(orders.shop_id, shops.id))
      .leftJoin(models, eq(orders.device_id, models.id))
      .leftJoin(shipping_details, eq(orders.id, shipping_details.orderId))
      .where(eq(orders.id, orderId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Extract dynamic field data from order information
   */
  private extractFieldData(orderData: any): Record<string, any> {
    const deviceSnapshot = orderData.deviceSnapshot || {};
    
    return {
      // Order fields
      'order.orderNumber': orderData.orderNumber || '',
      'order.status': orderData.status || '',
      'order.estimatedPrice': this.formatCurrency(orderData.estimatedPrice),
      'order.finalPrice': this.formatCurrency(orderData.finalPrice),
      'order.createdAt': this.formatDate(orderData.createdAt),
      
      // Device fields from snapshot
      'device.modelName': deviceSnapshot.modelName || orderData.modelTitle || '',
      'device.brandName': deviceSnapshot.brandName || '',
      'device.categoryName': deviceSnapshot.categoryName || '',
      
      // Customer fields
      'customer.name': orderData.sellerName || '',
      'customer.email': orderData.sellerEmail || '',
      
      // Shop fields
      'shop.name': orderData.shopName || '',
      'shop.phone': orderData.shopPhone || '',
      
      // Shipping fields
      'shipping.trackingNumber': orderData.trackingNumber || '',
      'shipping.provider': orderData.shippingProvider || '',
    };
  }

  /**
   * Replace placeholders in template content with actual values
   */
  private replacePlaceholders(content: string, fields: Record<string, any>): string {
    let result = content;
    
    for (const [fieldKey, value] of Object.entries(fields)) {
      // Support both {{fieldKey}} and {fieldKey} formats
      const regex1 = new RegExp(`{{${fieldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}}}`, 'g');
      const regex2 = new RegExp(`{${fieldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}}`, 'g');
      
      result = result.replace(regex1, String(value || ''));
      result = result.replace(regex2, String(value || ''));
    }
    
    return result;
  }

  /**
   * Format currency values
   */
  private formatCurrency(amount?: string | number | null): string {
    if (amount === null || amount === undefined) return '€0.00';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return '€0.00';
    return new Intl.NumberFormat('nl-NL', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(numericAmount);
  }

  /**
   * Format date values
   */
  private formatDate(date?: string | Date | null): string {
    if (!date) return '';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  /**
   * Create sample email templates for testing and demonstration
   */
  async createSampleTemplates(shopId: number): Promise<EmailTemplate[]> {
    const sampleTemplates = [
      {
        name: "Order Confirmation",
        subject: "Order Confirmation - {{order.orderNumber}}",
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Order Confirmation</h2>
            
            <p>Dear {{customer.name}},</p>
            
            <p>Thank you for your order! We have received your {{device.brandName}} {{device.modelName}} and assigned it order number <strong>{{order.orderNumber}}</strong>.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Order Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Device:</strong> {{device.brandName}} {{device.modelName}}</li>
                <li><strong>Category:</strong> {{device.categoryName}}</li>
                <li><strong>Estimated Value:</strong> {{order.estimatedPrice}}</li>
                <li><strong>Order Date:</strong> {{order.createdAt}}</li>
                <li><strong>Status:</strong> {{order.status}}</li>
              </ul>
            </div>
            
            <p>Please ship your device to us using the provided shipping label. Once we receive it, we'll inspect it and provide you with a final offer.</p>
            
            <p>Best regards,<br>
            {{shop.name}}<br>
            {{shop.phone}}</p>
          </div>
        `,
        templateType: EMAIL_TEMPLATE_TYPE.ORDER_CONFIRMATION,
        isActive: true
      },
      {
        name: "Shipment Received",
        subject: "We've Received Your Device - {{order.orderNumber}}",
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Device Received!</h2>
            
            <p>Hello {{customer.name}},</p>
            
            <p>Great news! We have successfully received your {{device.brandName}} {{device.modelName}} (Order: {{order.orderNumber}}).</p>
            
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <h3 style="margin-top: 0; color: #059669;">Tracking Information</h3>
              <p><strong>Tracking Number:</strong> {{shipping.trackingNumber}}</p>
              <p><strong>Carrier:</strong> {{shipping.provider}}</p>
              <p><strong>Received Date:</strong> {{order.createdAt}}</p>
            </div>
            
            <p>Our technical team will now inspect your device thoroughly. This process typically takes 1-2 business days. We'll send you another email once the inspection is complete with our final offer.</p>
            
            <p>Thank you for choosing {{shop.name}}!</p>
            
            <p>Best regards,<br>
            The {{shop.name}} Team</p>
          </div>
        `,
        templateType: EMAIL_TEMPLATE_TYPE.SHIPMENT_RECEIVED,
        isActive: true
      },
      {
        name: "Inspection Completed",
        subject: "Inspection Complete - Final Offer for {{order.orderNumber}}",
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Inspection Complete</h2>
            
            <p>Dear {{customer.name}},</p>
            
            <p>We have completed the inspection of your {{device.brandName}} {{device.modelName}} (Order: {{order.orderNumber}}).</p>
            
            <div style="background-color: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h3 style="margin-top: 0; color: #7c3aed;">Final Offer</h3>
              <p style="font-size: 24px; font-weight: bold; color: #7c3aed; margin: 10px 0;">{{order.finalPrice}}</p>
              <p><small>Original estimate: {{order.estimatedPrice}}</small></p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0;">Device Condition Notes</h4>
              <p style="margin-bottom: 0;">Our inspection found the device to be in good condition with minor wear consistent with normal use.</p>
            </div>
            
            <p>You have <strong>7 days</strong> to accept or decline this offer. If you don't respond within this timeframe, we'll assume you decline and return your device.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">Accept Offer</a>
              <a href="#" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Decline Offer</a>
            </div>
            
            <p>Questions? Contact us at {{shop.phone}}.</p>
            
            <p>Best regards,<br>
            {{shop.name}}</p>
          </div>
        `,
        templateType: EMAIL_TEMPLATE_TYPE.INSPECTION_COMPLETED,
        isActive: true
      },
      {
        name: "Offer Accepted",
        subject: "Payment Processing - {{order.orderNumber}}",
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Offer Accepted - Payment Processing</h2>
            
            <p>Excellent! {{customer.name}},</p>
            
            <p>Thank you for accepting our offer of <strong>{{order.finalPrice}}</strong> for your {{device.brandName}} {{device.modelName}}.</p>
            
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <h3 style="margin-top: 0; color: #059669;">Payment Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Amount:</strong> {{order.finalPrice}}</li>
                <li><strong>Order:</strong> {{order.orderNumber}}</li>
                <li><strong>Processing Time:</strong> 1-3 business days</li>
              </ul>
            </div>
            
            <p>Your payment is now being processed and will be transferred to your account within 1-3 business days. You'll receive a confirmation email once the payment has been sent.</p>
            
            <p>Thank you for choosing {{shop.name}} for your device buyback needs!</p>
            
            <p>Best regards,<br>
            {{shop.name}}<br>
            {{shop.phone}}</p>
          </div>
        `,
        templateType: EMAIL_TEMPLATE_TYPE.OFFER_ACCEPTED,
        isActive: true
      }
    ];

    const createdTemplates: EmailTemplate[] = [];
    
    for (const templateData of sampleTemplates) {
      try {
        const created = await this.createTemplate(shopId, templateData);
        if (created) {
          createdTemplates.push(created);
        }
      } catch (error) {
        console.error(`Failed to create sample template: ${templateData.name}`, error);
      }
    }
    
    return createdTemplates;
  }
}

export const emailTemplateService = new EmailTemplateService(); 