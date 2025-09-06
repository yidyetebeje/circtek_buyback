import { eq, and, like, desc, sql } from "drizzle-orm";
import { db } from "../../db";
import { emailTemplates, emailTemplateDynamicFields, NewEmailTemplate, EmailTemplate, EmailTemplateType } from "../../db/email_template.schema";
import { EmailTemplateListQuery } from "../types";
import { randomUUID } from "crypto";

export class EmailTemplateRepository {
  /**
   * Get all email templates with filtering and pagination
   */
  async findMany(query: EmailTemplateListQuery = {}): Promise<{
    data: EmailTemplate[];
    total: number;
  }> {
    const {
      shopId,
      templateType,
      isActive,
      limit = 50,
      offset = 0,
      search
    } = query;

    // Build where conditions
    const conditions: any[] = [];
    
    if (shopId !== undefined) {
      conditions.push(eq(emailTemplates.shopId, shopId));
    }
    
    if (templateType !== undefined) {
      conditions.push(eq(emailTemplates.templateType, templateType));
    }
    
    if (isActive !== undefined) {
      conditions.push(eq(emailTemplates.isActive, isActive ? 1 : 0));
    }
    
    if (search) {
      conditions.push(
        sql`(${emailTemplates.name} LIKE ${`%${search}%`} OR ${emailTemplates.subject} LIKE ${`%${search}%`})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailTemplates)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;

    // Get data with pagination
    const data = await db
      .select()
      .from(emailTemplates)
      .where(whereClause)
      .orderBy(desc(emailTemplates.updatedAt))
      .limit(limit)
      .offset(offset);

    return { data, total };
  }

  /**
   * Get a single email template by ID
   */
  async findById(id: string): Promise<EmailTemplate | null> {
    const result = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get email template by shop and type
   */
  async findByShopAndType(shopId: number, templateType: EmailTemplateType): Promise<EmailTemplate | null> {
    const result = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.shopId, shopId),
          eq(emailTemplates.templateType, templateType),
          eq(emailTemplates.isActive, 1)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a new email template
   */
  async create(data: Omit<NewEmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const id = randomUUID();
    const now = new Date();

    const newTemplate: NewEmailTemplate = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now
    };

    await db.insert(emailTemplates).values(newTemplate);
    
    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to create email template');
    }
    
    return created;
  }

  /**
   * Update an email template
   */
  async update(id: string, data: Partial<Omit<NewEmailTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<EmailTemplate | null> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    await db
      .update(emailTemplates)
      .set(updateData)
      .where(eq(emailTemplates.id, id));

    return this.findById(id);
  }

  /**
   * Delete an email template
   */
  async delete(id: string): Promise<void> {
    await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.id, id));
  }

  /**
   * Get all active dynamic fields grouped by category
   */
  async getDynamicFields(): Promise<{
    data: Array<{
      category: string;
      fields: Array<{
        id: string;
        fieldKey: string;
        displayName: string;
        description: string | null;
        dataType: string;
        defaultValue: string | null;
      }>;
    }>;
  }> {
    const fields = await db
      .select()
      .from(emailTemplateDynamicFields)
      .where(eq(emailTemplateDynamicFields.isActive, 1))
      .orderBy(emailTemplateDynamicFields.category, emailTemplateDynamicFields.displayName);

    // Group by category
    const grouped = fields.reduce((acc, field) => {
      if (!acc[field.category]) {
        acc[field.category] = [];
      }
      acc[field.category].push({
        id: field.id,
        fieldKey: field.fieldKey,
        displayName: field.displayName,
        description: field.description,
        dataType: field.dataType,
        defaultValue: field.defaultValue
      });
      return acc;
    }, {} as Record<string, any[]>);

    const data = Object.entries(grouped).map(([category, fields]) => ({
      category,
      fields
    }));

    return { data };
  }
} 