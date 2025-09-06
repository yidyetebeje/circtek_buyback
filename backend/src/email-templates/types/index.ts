import { EmailTemplate, EmailTemplateDynamicField, EMAIL_TEMPLATE_TYPE, EmailTemplateType } from "../../db/email_template.schema";

export type { EmailTemplate, EmailTemplateDynamicField };
export { EMAIL_TEMPLATE_TYPE };

export interface EmailTemplateCreateRequest {
  name: string;
  subject: string;
  content: string;
  templateType: EmailTemplateType;
  isActive?: boolean;
}

export interface EmailTemplateUpdateRequest extends Partial<EmailTemplateCreateRequest> {
  id: string;
}

export interface EmailTemplateListQuery {
  shopId?: number;
  templateType?: EmailTemplateType;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface EmailTemplatePopulateRequest {
  templateId: string;
  orderId: string;
  subject?: string;
  content?: string;
}

export interface EmailTemplatePopulatedResponse {
  subject: string;
  content: string;
  populatedFields: Record<string, any>;
}

export interface DynamicFieldGroup {
  category: string;
  fields: EmailTemplateDynamicField[];
}

// Default dynamic fields that should be seeded
export const DEFAULT_DYNAMIC_FIELDS: Omit<EmailTemplateDynamicField, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Order fields
  {
    fieldKey: 'order.orderNumber',
    displayName: 'Order Number',
    description: 'The unique order number assigned to this order',
    category: 'order',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  },
  {
    fieldKey: 'order.status',
    displayName: 'Order Status',
    description: 'Current status of the order',
    category: 'order',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  },
  {
    fieldKey: 'order.estimatedPrice',
    displayName: 'Estimated Price',
    description: 'The estimated price for the device',
    category: 'order',
    dataType: 'currency',
    defaultValue: '0.00',
    isActive: 1
  },
  {
    fieldKey: 'order.finalPrice',
    displayName: 'Final Price',
    description: 'The final agreed price for the device',
    category: 'order',
    dataType: 'currency',
    defaultValue: '0.00',
    isActive: 1
  },
  {
    fieldKey: 'order.createdAt',
    displayName: 'Order Date',
    description: 'When the order was created',
    category: 'order',
    dataType: 'date',
    defaultValue: '',
    isActive: 1
  },
  
  // Device fields
  {
    fieldKey: 'device.modelName',
    displayName: 'Device Model',
    description: 'The name/model of the device',
    category: 'device',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  },
  {
    fieldKey: 'device.brandName',
    displayName: 'Device Brand',
    description: 'The brand of the device',
    category: 'device',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  },
  {
    fieldKey: 'device.categoryName',
    displayName: 'Device Category',
    description: 'The category of the device',
    category: 'device',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  },
  
  // Customer fields
  {
    fieldKey: 'customer.name',
    displayName: 'Customer Name',
    description: 'The name of the customer/seller',
    category: 'customer',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  },
  {
    fieldKey: 'customer.email',
    displayName: 'Customer Email',
    description: 'The email address of the customer',
    category: 'customer',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  },
  
  // Shop fields
  {
    fieldKey: 'shop.name',
    displayName: 'Shop Name',
    description: 'The name of the shop',
    category: 'shop',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  },
  {
    fieldKey: 'shop.email',
    displayName: 'Shop Email',
    description: 'The contact email of the shop',
    category: 'shop',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  },
  {
    fieldKey: 'shop.phone',
    displayName: 'Shop Phone',
    description: 'The contact phone number of the shop',
    category: 'shop',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  },
  
  // Shipping fields
  {
    fieldKey: 'shipping.trackingNumber',
    displayName: 'Tracking Number',
    description: 'The shipment tracking number',
    category: 'shipping',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  },
  {
    fieldKey: 'shipping.provider',
    displayName: 'Shipping Provider',
    description: 'The shipping/courier company',
    category: 'shipping',
    dataType: 'string',
    defaultValue: '',
    isActive: 1
  }
]; 