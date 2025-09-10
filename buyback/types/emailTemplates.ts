/**
 * Email template types for the frontend
 */

// Email template types enum
export const EMAIL_TEMPLATE_TYPE = {
  ORDER_CONFIRMATION: "ORDER_CONFIRMATION",
  SHIPMENT_RECEIVED: "SHIPMENT_RECEIVED",
  INSPECTION_COMPLETED: "INSPECTION_COMPLETED",
  OFFER_ACCEPTED: "OFFER_ACCEPTED",
  OFFER_REJECTED: "OFFER_REJECTED",
  ORDER_COMPLETED: "ORDER_COMPLETED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  CUSTOM: "CUSTOM"
} as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPE[keyof typeof EMAIL_TEMPLATE_TYPE];

/**
 * Email template entity
 */
export interface EmailTemplate {
  id: string;
  shopId: number;
  name: string;
  subject: string;
  content: string;
  templateType: EmailTemplateType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Email template dynamic field
 */
export interface EmailTemplateDynamicField {
  id: string;
  fieldKey: string;
  displayName: string;
  description?: string;
  category: string;
  dataType: string;
  defaultValue?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request types for creating email templates
 */
export interface EmailTemplateCreateRequest {
  name: string;
  subject: string;
  content: string;
  templateType: EmailTemplateType;
  isActive?: boolean;
}

/**
 * Request types for updating email templates
 */
export interface EmailTemplateUpdateRequest extends Partial<EmailTemplateCreateRequest> {
  id: string;
}

/**
 * Query parameters for listing email templates
 */
export interface EmailTemplateListQuery {
  shopId?: number;
  templateType?: EmailTemplateType;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}

/**
 * Request for populating/previewing a template
 */
export interface EmailTemplatePopulateRequest {
  templateId: string;
  orderId: string;
  subject?: string;
  content?: string;
}

/**
 * Response for populated template
 */
export interface EmailTemplatePopulatedResponse {
  subject: string;
  content: string;
  populatedFields: Record<string, string | number | boolean>;
}

/**
 * Dynamic field group for organizing fields by category
 */
export interface DynamicFieldGroup {
  category: string;
  fields: EmailTemplateDynamicField[];
} 