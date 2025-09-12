import { asc, desc, eq, and, sql, inArray, InferSelectModel, like, getTableColumns } from "drizzle-orm";
import { db } from "../../db";
import { model_series } from "../../db/buyback_catalogue.schema";
import { model_series_translations, shop_model_series } from "../../db/shops.schema";
import { languages } from "../../db/buyback_catalogue.schema";
import { TModelSeriesCreate, TModelSeriesUpdate, TModelSeriesTranslationCreate, TModelSeriesTranslationInsert } from "../types/modelSeriesTypes";
import { toSafeUrl } from "../utils/urlUtils";
import { ConflictError } from "../utils/errors";

// Helper to remove undefined keys from an object
function removeUndefinedKeys<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

export class ModelSeriesRepository {
  async findAll(
    page = 1,
    limit = 20,
    orderBy = "order_no",
    order: "asc" | "desc" = "asc",
    tenantId?: number,
    search?: string,
    includePublishedShops = true
  ) {
    const offset = (page - 1) * limit;

    // Build where clause based on filters
    const conditions = [];
    if (tenantId) {
      conditions.push(eq(model_series.tenant_id, tenantId));
    }
    if (search) {
      conditions.push(like(model_series.title, `%${search}%`));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Create a column mapping for type safety
    const columnMapping = {
      id: model_series.id,
      title: model_series.title,
      icon_image: model_series.icon_image,
      image: model_series.image,
      description: model_series.description,
      meta_title: model_series.meta_title,
      sef_url: model_series.sef_url,
      meta_canonical_url: model_series.meta_canonical_url,
      meta_description: model_series.meta_description,
      meta_keywords: model_series.meta_keywords,
      order_no: model_series.order_no,
      tenant_id: model_series.tenant_id,
      createdAt: model_series.createdAt,
      updatedAt: model_series.updatedAt
    };

    // Make sure orderBy is a valid column
    if (!(orderBy in columnMapping)) {
      orderBy = "order_no"; // Default to a safe column if invalid
    }

    // Build the select object conditionally
    const selectFields: any = {
      ...getTableColumns(model_series),
      translations: sql<any[]>`COALESCE(
        JSON_ARRAYAGG(
          CASE 
            WHEN ${model_series_translations.id} IS NOT NULL 
            THEN JSON_OBJECT(
              'id', ${model_series_translations.id},
              'title', ${model_series_translations.title},
              'description', ${model_series_translations.description},
              'language_id', ${model_series_translations.language_id}
            )
          END
        ), 
        JSON_ARRAY()
      )`.as('translations')
    };

    if (includePublishedShops) {
      selectFields.publishedInShops = sql<any[]>`CASE 
        WHEN MAX(${shop_model_series.shop_id}) IS NULL 
        THEN NULL
        ELSE JSON_ARRAYAGG(
          JSON_OBJECT(
            'shop_id', ${shop_model_series.shop_id},
            'is_published', ${shop_model_series.is_published},
            'createdAt', ${shop_model_series.createdAt},
            'updatedAt', ${shop_model_series.updatedAt}
          )
        )
      END`.as('publishedInShops');
    }

    // Build the main query
    let query = db.select(selectFields)
      .from(model_series)
      .leftJoin(model_series_translations, eq(model_series.id, model_series_translations.series_id));

    if (includePublishedShops) {
      query = query.leftJoin(shop_model_series, and(
        eq(model_series.id, shop_model_series.series_id),
        eq(shop_model_series.is_published, 1)
      ));
    }

    const [items, totalCount] = await Promise.all([
      query
        .where(whereCondition || sql`1=1`)
        .groupBy(model_series.id)
        .limit(limit)
        .offset(offset)
        .orderBy(
          order === "asc" 
            ? asc(columnMapping[orderBy as keyof typeof columnMapping])
            : desc(columnMapping[orderBy as keyof typeof columnMapping])
        ),
      db.select({ count: sql<number>`count(*)` })
        .from(model_series)
        .where(whereCondition ? whereCondition : sql`1=1`)
    ]);

    return {
      data: items,
      meta: {
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    };
  }

  async findById(id: number, includeTranslations = true, includePublishedShops = true) {
    // Build the select object conditionally
    const selectFields: any = {
      ...getTableColumns(model_series),
      ...(includeTranslations ? {
        translations: sql<any[]>`COALESCE(
          JSON_ARRAYAGG(
            CASE 
              WHEN ${model_series_translations.id} IS NOT NULL 
              THEN JSON_OBJECT(
                'id', ${model_series_translations.id},
                'title', ${model_series_translations.title},
                'description', ${model_series_translations.description},
                'language_id', ${model_series_translations.language_id}
              )
            END
          ), 
          JSON_ARRAY()
        )`.as('translations')
      } : {}),
      ...(includePublishedShops ? {
        publishedInShops: sql<any[]>`CASE 
          WHEN MAX(${shop_model_series.shop_id}) IS NULL 
          THEN NULL
          ELSE JSON_ARRAYAGG(
            JSON_OBJECT(
              'shop_id', ${shop_model_series.shop_id},
              'is_published', ${shop_model_series.is_published},
              'createdAt', ${shop_model_series.createdAt},
              'updatedAt', ${shop_model_series.updatedAt}
            )
          )
        END`.as('publishedInShops')
      } : {})
    };

    // Build the complete query based on what should be included
    let query;
    
    if (includeTranslations && includePublishedShops) {
      query = db.select(selectFields)
        .from(model_series)
        .leftJoin(model_series_translations, eq(model_series.id, model_series_translations.series_id))
        .leftJoin(shop_model_series, and(
        eq(model_series.id, shop_model_series.series_id),
        eq(shop_model_series.is_published, 1)
      ));
    } else if (includeTranslations) {
      query = db.select(selectFields)
        .from(model_series)
        .leftJoin(model_series_translations, eq(model_series.id, model_series_translations.series_id));
    } else if (includePublishedShops) {
      query = db.select(selectFields)
        .from(model_series)
        .leftJoin(shop_model_series, and(
        eq(model_series.id, shop_model_series.series_id),
        eq(shop_model_series.is_published, 1)
      ));
    } else {
      query = db.select(selectFields)
        .from(model_series);
    }

    const result = await query
      .where(eq(model_series.id, id))
      .groupBy(model_series.id)
      .limit(1);
    
    return result[0] || null;
  }

  async findBySlug(slug: string, tenantId: number, includePublishedShops = true) {
    // Build the select object conditionally
    const selectFields: any = {
      ...getTableColumns(model_series),
      translations: sql<any[]>`COALESCE(
        JSON_ARRAYAGG(
          CASE 
            WHEN ${model_series_translations.id} IS NOT NULL 
            THEN JSON_OBJECT(
              'id', ${model_series_translations.id},
              'title', ${model_series_translations.title},
              'description', ${model_series_translations.description},
              'language_id', ${model_series_translations.language_id}
            )
          END
        ), 
        JSON_ARRAY()
      )`.as('translations')
    };

    if (includePublishedShops) {
      selectFields.publishedInShops = sql<any[]>`CASE 
        WHEN MAX(${shop_model_series.shop_id}) IS NULL 
        THEN NULL
        ELSE JSON_ARRAYAGG(
          JSON_OBJECT(
            'shop_id', ${shop_model_series.shop_id},
            'is_published', ${shop_model_series.is_published},
            'createdAt', ${shop_model_series.createdAt},
            'updatedAt', ${shop_model_series.updatedAt}
          )
        )
      END`.as('publishedInShops');
    }

    // Build the complete query based on what should be included
    let query;
    
    if (includePublishedShops) {
      query = db.select(selectFields)
        .from(model_series)
        .leftJoin(model_series_translations, eq(model_series.id, model_series_translations.series_id))
        .leftJoin(shop_model_series, and(
        eq(model_series.id, shop_model_series.series_id),
        eq(shop_model_series.is_published, 1)
      ));
    } else {
      query = db.select(selectFields)
        .from(model_series)
        .leftJoin(model_series_translations, eq(model_series.id, model_series_translations.series_id));
    }

    const result = await query
      .where(and(
        eq(model_series.sef_url, slug),
        eq(model_series.tenant_id, tenantId)
      ))
      .groupBy(model_series.id)
      .limit(1);
    
    return result[0] || null;
  }

  async create(data: Omit<TModelSeriesCreate, 'translations'>) {
    try {
      const now = new Date();
      const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);
      
      // Generate SEF URL from title if not provided
      if (!data.sef_url && data.title) {
        data.sef_url = toSafeUrl(data.title);
      }
      
      const dbData = {
        ...removeUndefinedKeys(data),
        createdAt: formattedDate,
        updatedAt: formattedDate
      };

      const result = await db.insert(model_series).values(dbData as any);
      const insertId = result?.[0]?.insertId ?? 0;
      return this.findById(Number(insertId), false);
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('Duplicate entry for model series');
      }
      throw error;
    }
  }

  async update(id: number, data: Partial<Omit<TModelSeriesUpdate, 'translations'>>) {
    // Format date in MySQL format (YYYY-MM-DD HH:MM:SS)
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Generate SEF URL from title if title is provided but sef_url is not
    if (data.title && data.sef_url === undefined) {
      data.sef_url = toSafeUrl(data.title);
    }
    
    const dbData = {
      ...removeUndefinedKeys(data),
      updatedAt: formattedDate
    };

    await db.update(model_series)
      .set(dbData as any)
      .where(eq(model_series.id, id));
    return this.findById(id);
  }

  async delete(id: number) {
    await db.delete(model_series_translations).where(eq(model_series_translations.series_id, id));
    await db.delete(model_series).where(eq(model_series.id, id));
    return true;
  }

  async createTranslation(data: TModelSeriesTranslationInsert) {
    try {
      const dbData = removeUndefinedKeys(data);
      const result = await db.insert(model_series_translations).values(dbData as TModelSeriesTranslationInsert);
      const insertId = result?.[0]?.insertId ?? 0;
      return this.findTranslationById(Number(insertId));
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('Duplicate translation for this model series and language');
      }
      throw error;
    }
  }

  async findTranslationById(id: number) {
    const result = await db.select()
      .from(model_series_translations)
      .leftJoin(languages, eq(model_series_translations.language_id, languages.id))
      .where(eq(model_series_translations.id, id));
    
    if (result.length === 0) {
      return undefined;
    }
    
    const translation = result[0];
    return {
      ...translation.model_series_translations,
      language: translation.languages
    };
  }

  async findTranslation(seriesId: number, languageId: number) {
    const translation = await db.select()
      .from(model_series_translations)
      .leftJoin(languages, eq(model_series_translations.language_id, languages.id))
      .where(and(
        eq(model_series_translations.series_id, seriesId),
        eq(model_series_translations.language_id, languageId)
      ));
    return translation;
  }

  async findTranslationsForSeries(seriesId: number) {
    const translations = await db.select()
      .from(model_series_translations)
      .leftJoin(languages, eq(model_series_translations.language_id, languages.id))
      .where(eq(model_series_translations.series_id, seriesId));
    return translations;
  }

  async updateTranslation(id: number, data: Partial<Omit<TModelSeriesTranslationInsert, 'id' | 'series_id' | 'language_id'>>) {
    const dbData = removeUndefinedKeys(data);
    await db.update(model_series_translations)
      .set(dbData)
      .where(eq(model_series_translations.id, id));
    return this.findTranslationById(id);
  }

  async updateTranslationBySeriesAndLanguage(seriesId: number, languageId: number, data: Partial<Omit<TModelSeriesTranslationInsert, 'series_id' | 'language_id'>>) {
    const dbData = removeUndefinedKeys(data);
    await db.update(model_series_translations)
        .set(dbData as any)
        .where(and(
            eq(model_series_translations.series_id, seriesId),
            eq(model_series_translations.language_id, languageId)
        ));
    return this.findTranslation(seriesId, languageId); // Return the updated translation
  }

  async deleteTranslation(seriesId: number, languageId: number): Promise<boolean> {
    const result = await db.delete(model_series_translations)
        .where(and(
            eq(model_series_translations.series_id, seriesId),
            eq(model_series_translations.language_id, languageId)
        ));
    // Check if any row was actually deleted
    // Cast via unknown as suggested by TS to access potentially existing property
    const affectedRows = (result as unknown as { affectedRows?: number }).affectedRows;
    return affectedRows !== undefined && affectedRows > 0;
  }

  async deleteTranslationsForSeries(seriesId: number, excludeLanguageIds: number[] = []) {
    const whereClause = excludeLanguageIds.length > 0
      ? and(
          eq(model_series_translations.series_id, seriesId),
          sql`${model_series_translations.language_id} NOT IN (${excludeLanguageIds.join(',')})`
        )
      : eq(model_series_translations.series_id, seriesId);

    await db.delete(model_series_translations).where(whereClause);
    return true;
  }

  /**
   * Find model series published in a specific shop with pagination and filtering
   * @param shopId Shop ID
   * @param page Page number
   * @param limit Items per page
   * @param orderBy Column to sort by
   * @param order Sort order
   * @param search Optional search term
   * @param tenantId Optional tenant ID filter
   * @returns Paginated list of model series published in the shop
   */
  async findPublishedInShop(
    shopId: number,
    page = 1,
    limit = 20,
    orderBy = "title",
    order: "asc" | "desc" = "asc",
    search?: string,
    tenantId?: number
  ) {
    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions = [
      eq(shop_model_series.shop_id, shopId),
      eq(shop_model_series.is_published, 1)
    ];

    if (tenantId !== undefined) {
      whereConditions.push(eq(model_series.tenant_id, tenantId));
    }

    // Add search condition if provided
    if (search && search.trim() !== '') {
      whereConditions.push(like(model_series.title, `%${search}%`));
    }

    const whereClause = and(...whereConditions);

    // Define mapping for orderBy
    const columnMapping = {
      id: model_series.id,
      title: model_series.title,
      icon_image: model_series.icon_image,
      image: model_series.image,
      description: model_series.description,
      meta_title: model_series.meta_title,
      sef_url: model_series.sef_url,
      order_no: model_series.order_no,
      meta_canonical_url: model_series.meta_canonical_url,
      meta_description: model_series.meta_description,
      meta_keywords: model_series.meta_keywords,
      tenant_id: model_series.tenant_id,
      createdAt: model_series.createdAt,
      updatedAt: model_series.updatedAt
    };

    // Default to title if invalid orderBy is provided
    if (!(orderBy in columnMapping)) {
      orderBy = "title";
    }

    // Execute the query with join on shopModelSeries
    const [items, totalCount] = await Promise.all([
      db.select({
        id: model_series.id,
        title: model_series.title,
        icon_image: model_series.icon_image,
        image: model_series.image,
        description: model_series.description,
        meta_title: model_series.meta_title,
        sef_url: model_series.sef_url,
        order_no: model_series.order_no,
        meta_canonical_url: model_series.meta_canonical_url,
        meta_description: model_series.meta_description,
        meta_keywords: model_series.meta_keywords,
        tenant_id: model_series.tenant_id,
        createdAt: model_series.createdAt,
        updatedAt: model_series.updatedAt,
        is_published: shop_model_series.is_published
      })
      .from(model_series)
      .innerJoin(shop_model_series, eq(model_series.id, shop_model_series.series_id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(
        order === "asc"
          ? asc(columnMapping[orderBy as keyof typeof columnMapping])
          : desc(columnMapping[orderBy as keyof typeof columnMapping])
      ),

      db.select({ count: sql<number>`count(*)` })
        .from(model_series)
        .innerJoin(shop_model_series, eq(model_series.id, shop_model_series.series_id))
        .where(whereClause)
    ]);

    // Get translations for all items
    const seriesWithTranslations = await Promise.all(
      items.map(async (series) => {
        const translations = await this.findTranslationsForSeries(Number(series.id));
        return {
          ...series,
          translations
        };
      })
    );

    return {
      data: seriesWithTranslations,
      meta: {
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    };
  }
}

export const modelSeriesRepository = new ModelSeriesRepository();
