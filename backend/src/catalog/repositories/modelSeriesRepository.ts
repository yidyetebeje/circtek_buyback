import { asc, desc, eq, and, sql, inArray, InferSelectModel, like } from "drizzle-orm";
import { db } from "../../db";
import { modelSeries, modelSeriesTranslations, languages, shopModelSeries } from "../../db/schema/catalog";
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
    clientId?: number,
    search?: string,
    includeTranslations = true,
    includePublishedShops = true
  ) {
    const offset = (page - 1) * limit;

    const conditions = [];
    if (clientId) {
      conditions.push(eq(modelSeries.client_id, clientId));
    }
    if (search) {
      conditions.push(like(modelSeries.title, `%${search}%`));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const columnMapping = {
      id: modelSeries.id,
      title: modelSeries.title,
      icon_image: modelSeries.icon_image,
      image: modelSeries.image,
      description: modelSeries.description,
      meta_title: modelSeries.meta_title,
      sef_url: modelSeries.sef_url,
      meta_canonical_url: modelSeries.meta_canonical_url,
      meta_description: modelSeries.meta_description,
      meta_keywords: modelSeries.meta_keywords,
      order_no: modelSeries.order_no,
      client_id: modelSeries.client_id,
      createdAt: modelSeries.createdAt,
      updatedAt: modelSeries.updatedAt
    };

    if (!(orderBy in columnMapping)) {
      orderBy = "order_no";
    }

    const [items, totalCount] = await Promise.all([
      db.query.modelSeries.findMany({
        where: whereCondition,
        limit,
        offset,
        orderBy: order === "asc"
          ? asc(columnMapping[orderBy as keyof typeof columnMapping])
          : desc(columnMapping[orderBy as keyof typeof columnMapping]),
        with: {
          translations: includeTranslations ? true : undefined,
          ...(includePublishedShops ? {
            publishedInShops: {
              where: eq(shopModelSeries.is_published, 1),
              columns: {
                shop_id: true
              }
            }
          } : {})
        }
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(modelSeries)
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
    return db.query.modelSeries.findFirst({
      where: eq(modelSeries.id, id),
      with: {
        translations: includeTranslations ? true : undefined,
        ...(includePublishedShops ? {
          publishedInShops: {
            where: eq(shopModelSeries.is_published, 1),
            columns: {
              shop_id: true
            }
          }
        } : {})
      }
    });
  }

  async findBySlug(slug: string, clientId: number, includePublishedShops = true) {
    return db.query.modelSeries.findFirst({
      where: and(
        eq(modelSeries.sef_url, slug),
        eq(modelSeries.client_id, clientId)
      ),
      with: {
        translations: true,
        ...(includePublishedShops ? {
          publishedInShops: {
            where: eq(shopModelSeries.is_published, 1),
            columns: {
              shop_id: true
            }
          }
        } : {})
      }
    });
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

      const result = await db.insert(modelSeries).values(dbData as any);
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

    await db.update(modelSeries)
      .set(dbData as any)
      .where(eq(modelSeries.id, id));
    return this.findById(id);
  }

  async delete(id: number) {
    await db.delete(modelSeriesTranslations).where(eq(modelSeriesTranslations.series_id, id));
    await db.delete(modelSeries).where(eq(modelSeries.id, id));
    return true;
  }

  async createTranslation(data: TModelSeriesTranslationInsert) {
    try {
      const dbData = removeUndefinedKeys(data);
      const result = await db.insert(modelSeriesTranslations).values(dbData as TModelSeriesTranslationInsert);
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
    return db.query.modelSeriesTranslations.findFirst({
      where: eq(modelSeriesTranslations.id, id),
      with: { language: true }
    });
  }

  async findTranslation(seriesId: number, languageId: number) {
    return db.query.modelSeriesTranslations.findFirst({
      where: and(
        eq(modelSeriesTranslations.series_id, seriesId),
        eq(modelSeriesTranslations.language_id, languageId)
      )
    });
  }

  async findTranslationsForSeries(seriesId: number) {
    return db.query.modelSeriesTranslations.findMany({
      where: eq(modelSeriesTranslations.series_id, seriesId),
      with: {
        language: true
      }
    });
  }

  async updateTranslation(id: number, data: Partial<Omit<TModelSeriesTranslationInsert, 'id' | 'series_id' | 'language_id'>>) {
    const dbData = removeUndefinedKeys(data);
    await db.update(modelSeriesTranslations)
      .set(dbData)
      .where(eq(modelSeriesTranslations.id, id));
    return this.findTranslationById(id);
  }

  async updateTranslationBySeriesAndLanguage(seriesId: number, languageId: number, data: Partial<Omit<TModelSeriesTranslationInsert, 'series_id' | 'language_id'>>) {
    const dbData = removeUndefinedKeys(data);
    await db.update(modelSeriesTranslations)
        .set(dbData as any)
        .where(and(
            eq(modelSeriesTranslations.series_id, seriesId),
            eq(modelSeriesTranslations.language_id, languageId)
        ));
    return this.findTranslation(seriesId, languageId); // Return the updated translation
  }

  async deleteTranslation(seriesId: number, languageId: number): Promise<boolean> {
    const result = await db.delete(modelSeriesTranslations)
        .where(and(
            eq(modelSeriesTranslations.series_id, seriesId),
            eq(modelSeriesTranslations.language_id, languageId)
        ));
    // Check if any row was actually deleted
    // Cast via unknown as suggested by TS to access potentially existing property
    const affectedRows = (result as unknown as { affectedRows?: number }).affectedRows;
    return affectedRows !== undefined && affectedRows > 0;
  }

  async deleteTranslationsForSeries(seriesId: number, excludeLanguageIds: number[] = []) {
    const whereClause = excludeLanguageIds.length > 0
      ? and(
          eq(modelSeriesTranslations.series_id, seriesId),
          sql`${modelSeriesTranslations.language_id} NOT IN (${excludeLanguageIds.join(',')})`
        )
      : eq(modelSeriesTranslations.series_id, seriesId);

    await db.delete(modelSeriesTranslations).where(whereClause);
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
   * @param clientId Optional client ID filter
   * @returns Paginated list of model series published in the shop
   */
  async findPublishedInShop(
    shopId: number,
    page = 1,
    limit = 20,
    orderBy = "title",
    order: "asc" | "desc" = "asc",
    search?: string,
    clientId?: number
  ) {
    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions = [
      eq(shopModelSeries.shop_id, shopId),
      eq(shopModelSeries.is_published, 1)
    ];

    if (clientId !== undefined) {
      whereConditions.push(eq(modelSeries.client_id, clientId));
    }

    // Add search condition if provided
    if (search && search.trim() !== '') {
      whereConditions.push(like(modelSeries.title, `%${search}%`));
    }

    const whereClause = and(...whereConditions);

    // Define mapping for orderBy
    const columnMapping = {
      id: modelSeries.id,
      title: modelSeries.title,
      icon_image: modelSeries.icon_image,
      image: modelSeries.image,
      description: modelSeries.description,
      meta_title: modelSeries.meta_title,
      sef_url: modelSeries.sef_url,
      order_no: modelSeries.order_no,
      meta_canonical_url: modelSeries.meta_canonical_url,
      meta_description: modelSeries.meta_description,
      meta_keywords: modelSeries.meta_keywords,
      client_id: modelSeries.client_id,
      createdAt: modelSeries.createdAt,
      updatedAt: modelSeries.updatedAt
    };

    // Default to title if invalid orderBy is provided
    if (!(orderBy in columnMapping)) {
      orderBy = "title";
    }

    // Execute the query with join on shopModelSeries
    const [items, totalCount] = await Promise.all([
      db.select({
        id: modelSeries.id,
        title: modelSeries.title,
        icon_image: modelSeries.icon_image,
        image: modelSeries.image,
        description: modelSeries.description,
        meta_title: modelSeries.meta_title,
        sef_url: modelSeries.sef_url,
        order_no: modelSeries.order_no,
        meta_canonical_url: modelSeries.meta_canonical_url,
        meta_description: modelSeries.meta_description,
        meta_keywords: modelSeries.meta_keywords,
        client_id: modelSeries.client_id,
        createdAt: modelSeries.createdAt,
        updatedAt: modelSeries.updatedAt,
        is_published: shopModelSeries.is_published
      })
      .from(modelSeries)
      .innerJoin(shopModelSeries, eq(modelSeries.id, shopModelSeries.series_id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(
        order === "asc"
          ? asc(columnMapping[orderBy as keyof typeof columnMapping])
          : desc(columnMapping[orderBy as keyof typeof columnMapping])
      ),

      db.select({ count: sql<number>`count(*)` })
        .from(modelSeries)
        .innerJoin(shopModelSeries, eq(modelSeries.id, shopModelSeries.series_id))
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
