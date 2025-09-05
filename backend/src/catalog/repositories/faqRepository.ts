import { eq, and, like, or, desc, asc, sql, count } from "drizzle-orm";
import { db } from "../../db";
import { faqs, faqTranslations } from "../../db/schema/faq";
import { languages } from "../../db/schema/catalog";
import { TFAQCreate, TFAQUpdate, TFAQTranslationCreate, TFAQTranslationUpdate } from "../types/faqTypes";
import { getCurrentMySQLDateTime } from "../utils/dateUtils";

export class FAQRepository {
  /**
   * Find all FAQs with pagination, filtering and sorting
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    orderBy: string = "order_no",
    order: "asc" | "desc" = "asc",
    filters: {
      shop_id?: number;
      client_id?: number;
      is_published?: boolean;
      search?: string;
    } = {}
  ) {
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const whereConditions = [];
    
    if (filters.shop_id) {
      whereConditions.push(eq(faqs.shop_id, filters.shop_id));
    }
    
    if (filters.client_id) {
      whereConditions.push(eq(faqs.client_id, filters.client_id));
    }
    
    if (filters.is_published !== undefined) {
      whereConditions.push(eq(faqs.is_published, filters.is_published ? 1 : 0));
    }
    
    if (filters.search) {
      whereConditions.push(
        or(
          like(faqs.question, `%${filters.search}%`),
          like(faqs.answer, `%${filters.search}%`)
        )
      );
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(faqs)
      .where(whereClause);
    
    const total = totalResult.count;
    
    // Build order clause based on valid columns
    let orderClause;
    if (orderBy === "order_no") {
      orderClause = order === "desc" ? desc(faqs.order_no) : asc(faqs.order_no);
    } else if (orderBy === "question") {
      orderClause = order === "desc" ? desc(faqs.question) : asc(faqs.question);
    } else if (orderBy === "created_at") {
      orderClause = order === "desc" ? desc(faqs.created_at) : asc(faqs.created_at);
    } else if (orderBy === "updated_at") {
      orderClause = order === "desc" ? desc(faqs.updated_at) : asc(faqs.updated_at);
    } else {
      orderClause = asc(faqs.order_no); // Default fallback
    }
    
    // Get FAQs with translations
    const results = await db
      .select({
        id: faqs.id,
        question: faqs.question,
        answer: faqs.answer,
        order_no: faqs.order_no,
        is_published: faqs.is_published,
        shop_id: faqs.shop_id,
        client_id: faqs.client_id,
        created_at: faqs.created_at,
        updated_at: faqs.updated_at,
      })
      .from(faqs)
      .where(whereClause)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset);
    
    // Fetch translations for each FAQ
    const faqsWithTranslations = await Promise.all(
      results.map(async (faq: typeof results[0]) => {
        const translations = await this.getTranslationsByFAQId(faq.id!);
        return {
          ...faq,
          is_published: !!faq.is_published,
          translations
        };
      })
    );
    
    return {
      data: faqsWithTranslations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find FAQ by ID with translations
   */
  async findById(id: number) {
    const [result] = await db
      .select()
      .from(faqs)
      .where(eq(faqs.id, id));
    
    if (!result) {
      return null;
    }
    
    const translations = await this.getTranslationsByFAQId(id);
    
    return {
      ...result,
      is_published: !!result.is_published,
      translations
    };
  }

  /**
   * Find FAQs by shop ID 
   */
  async findByShopId(shopId: number, isPublished?: boolean) {
    const whereConditions = [eq(faqs.shop_id, shopId)];
    
    if (isPublished !== undefined) {
      whereConditions.push(eq(faqs.is_published, isPublished ? 1 : 0));
    }
    
    const results = await db
      .select()
      .from(faqs)
      .where(and(...whereConditions))
      .orderBy(asc(faqs.order_no));
    
    // Fetch translations for each FAQ
    const faqsWithTranslations = await Promise.all(
      results.map(async (faq: typeof results[0]) => {
        const translations = await this.getTranslationsByFAQId(faq.id);
        return {
          ...faq,
          is_published: !!faq.is_published,
          translations
        };
      })
    );
    
    return faqsWithTranslations;
  }

  /**
   * Create a new FAQ
   */
  async create(data: TFAQCreate) {
    const mysqlDateTime = getCurrentMySQLDateTime();
    
    const [result] = await db
      .insert(faqs)
      .values({
        ...data,
        is_published: data.is_published ? 1 : 0,
        created_at: mysqlDateTime,
        updated_at: mysqlDateTime
      });
    
    return result.insertId;
  }

  /**
   * Update FAQ
   */
  async update(id: number, data: TFAQUpdate) {
    const updateData: any = {
      ...data,
      updated_at: getCurrentMySQLDateTime()
    };
    
    if (data.is_published !== undefined) {
      updateData.is_published = data.is_published ? 1 : 0;
    }
    
    await db
      .update(faqs)
      .set(updateData)
      .where(eq(faqs.id, id));
    
    return this.findById(id);
  }

  /**
   * Delete FAQ
   */
  async delete(id: number) {
    // First delete translations
    await db
      .delete(faqTranslations)
      .where(eq(faqTranslations.faq_id, id));
    
    // Then delete the FAQ
    await db
      .delete(faqs)
      .where(eq(faqs.id, id));
  }

  /**
   * Get translations by FAQ ID
   */
  async getTranslationsByFAQId(faqId: number) {
    return await db
      .select({
        id: faqTranslations.id,
        faq_id: faqTranslations.faq_id,
        language_id: faqTranslations.language_id,
        question: faqTranslations.question,
        answer: faqTranslations.answer,
        language: {
          id: languages.id,
          code: languages.code,
          name: languages.name
        }
      })
      .from(faqTranslations)
      .leftJoin(languages, eq(faqTranslations.language_id, languages.id))
      .where(eq(faqTranslations.faq_id, faqId));
  }

  /**
   * Create translation
   */
  async createTranslation(faqId: number, languageId: number, data: TFAQTranslationCreate) {
    const [result] = await db
      .insert(faqTranslations)
      .values({
        faq_id: faqId,
        language_id: languageId,
        ...data
      });
    
    return result.insertId;
  }

  /**
   * Update translation
   */
  async updateTranslation(faqId: number, languageId: number, data: TFAQTranslationUpdate) {
    await db
      .update(faqTranslations)
      .set(data)
      .where(
        and(
          eq(faqTranslations.faq_id, faqId),
          eq(faqTranslations.language_id, languageId)
        )
      );
    
    return this.getTranslationsByFAQId(faqId);
  }

  /**
   * Delete translation
   */
  async deleteTranslation(faqId: number, languageId: number) {
    await db
      .delete(faqTranslations)
      .where(and(eq(faqTranslations.faq_id, faqId), eq(faqTranslations.language_id, languageId)));
  }

  /**
   * Update FAQ order
   */
  async updateOrder(id: number, newOrder: number) {
    await db
      .update(faqs)
      .set({ 
        order_no: newOrder,
        updated_at: getCurrentMySQLDateTime()
      })
      .where(eq(faqs.id, id));
  }

  /**
   * Upsert FAQ translation (create or update)
   */
  async upsertFAQTranslation(faqId: number, languageId: number, data: TFAQTranslationCreate) {
    return await db
      .insert(faqTranslations)
      .values({
        faq_id: faqId,
        language_id: languageId,
        question: data.question,
        answer: data.answer,
      })
      .onDuplicateKeyUpdate({
        set: {
          question: data.question,
          answer: data.answer,
        },
      });
  }
}

export const faqRepository = new FAQRepository(); 