import { asc, desc, eq, and, sql, inArray, InferSelectModel, like, or, getTableColumns } from "drizzle-orm";
import { db } from "../../db";
import { 
  models, 
  languages, 
  device_model_question_set_assignments,
  question_sets,
  device_questions,
  model_series,
  device_categories,
  brands,
  question_options,
  model_test_price_drops
} from "../../db/buyback_catalogue.schema";
import { model_translations, shop_models } from "../../db/shops.schema";
import { TModelCreate, TModelUpdate, TModelTranslationInsert } from "../types/modelTypes";
import { toSafeUrl } from "../utils/urlUtils";
import { ConflictError } from "../utils/errors";

// Helper to remove undefined keys from an object
function removeUndefinedKeys<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

export class ModelRepository {
  async findAll(
    page = 1,
    limit = 20,
    orderBy = "title",
    order: "asc" | "desc" = "asc",
    categoryIds?: number[],
    brandIds?: number[],
    seriesIds?: number[],
    tenantId?: number,
    includeTranslations = true,
    includePublishedShops = true,
    search?: string
  ) {
    const offset = (page - 1) * limit;

    let whereConditions: any[] = [];
    
    if (tenantId !== undefined) {
      whereConditions.push(eq(models.tenant_id, tenantId));
    }
    
    if (categoryIds && categoryIds.length > 0) {
      if (categoryIds.length === 1) {
        whereConditions.push(eq(models.category_id, categoryIds[0]));
      } else {
        whereConditions.push(inArray(models.category_id, categoryIds));
      }
    }

    if (brandIds && brandIds.length > 0) {
      if (brandIds.length === 1) {
        whereConditions.push(eq(models.brand_id, brandIds[0]));
      } else {
        whereConditions.push(inArray(models.brand_id, brandIds));
      }
    }

    if (seriesIds && seriesIds.length > 0) {
      if (seriesIds.length === 1) {
        whereConditions.push(eq(models.model_series_id, seriesIds[0]));
      } else {
        whereConditions.push(inArray(models.model_series_id, seriesIds));
      }
    }

    // Add search LIKE condition if provided
    if (search && search.trim() !== '') {
      whereConditions.push(like(models.title, `%${search}%`));
    }

    const whereCondition = whereConditions.length > 0 
      ? and(...whereConditions)
      : undefined;

    const columnMapping = {
      id: models.id,
      title: models.title,
      sef_url: models.sef_url,
      base_price: models.base_price,
      category_id: models.category_id,
      brand_id: models.brand_id,
      model_series_id: models.model_series_id,
      tenant_id: models.tenant_id,
      createdAt: models.createdAt,
      updatedAt: models.updatedAt
    };

    if (!(orderBy in columnMapping)) {
      orderBy = "title";
    }
    let query = db
  .select({
    ...getTableColumns(models),
    category: getTableColumns(device_categories),
    brand: getTableColumns(brands),
    series: getTableColumns(model_series),
    testPriceDrops: getTableColumns(model_test_price_drops),
  })
  .from(models)
  .leftJoin(device_categories, eq(models.category_id, device_categories.id))
  .leftJoin(brands, eq(models.brand_id, brands.id))
  .leftJoin(model_series, eq(models.model_series_id, model_series.id))
  .leftJoin(model_test_price_drops, eq(models.id, model_test_price_drops.model_id));

  
  // Conditionally add the join for published shops
  if (includePublishedShops) {
    query = query.leftJoin(
      shop_models,
      and(
        eq(models.id, shop_models.model_id),
        eq(shop_models.is_published, 1)
      )
    );
  }
    const [items, totalCount] = await Promise.all([
      query.limit(limit).offset(offset).orderBy(order === "asc" ? asc(columnMapping[orderBy as keyof typeof columnMapping]) : desc(columnMapping[orderBy as keyof typeof columnMapping])),
      db.select({ count: sql<number>`count(*)` })
        .from(models)
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
    // Build the base query without conditional columns in select
    let query = db.select({
      models: getTableColumns(models),
      device_categories: getTableColumns(device_categories),
      brands: getTableColumns(brands),
      model_series: getTableColumns(model_series),
      model_test_price_drops: getTableColumns(model_test_price_drops)
    }).from(models)
    .leftJoin(device_categories, eq(models.category_id, device_categories.id))
    .leftJoin(brands, eq(models.brand_id, brands.id))
    .leftJoin(model_series, eq(models.model_series_id, model_series.id))
    .leftJoin(model_test_price_drops, eq(models.id, model_test_price_drops.model_id));
    
    // Add joins conditionally
    if (includeTranslations) {
      query = query.leftJoin(model_translations, eq(models.id, model_translations.model_id));
    }
    if (includePublishedShops) {
      query = query.leftJoin(shop_models, eq(models.id, shop_models.model_id));
    }
    
    const result = await query.where(eq(models.id, id));
    
    if (!result[0]) return null;
    
    // Build the response object conditionally
    const baseResult = result[0];
    let response: any = baseResult;
    
    // Add translations if requested and available
    if (includeTranslations) {
      const translations = await db
        .select(getTableColumns(model_translations))
        .from(model_translations)
        .where(eq(model_translations.model_id, id));
      response.model_translations = translations;
    }
    
    // Add shop models if requested and available
    if (includePublishedShops) {
      const shopModels = await db
        .select(getTableColumns(shop_models))
        .from(shop_models)
        .where(eq(shop_models.model_id, id));
      response.shop_models = shopModels;
    }
    
    return response;
  }

  async findBySlug(slug: string, tenant_id: number, includePublishedShops = true) {
    let query = db
      .select({
        ...getTableColumns(models),
        category: getTableColumns(device_categories),
        brand: getTableColumns(brands),
        series: getTableColumns(model_series),
        testPriceDrops: getTableColumns(model_test_price_drops)
      })
      .from(models)
      .leftJoin(device_categories, eq(models.category_id, device_categories.id))
      .leftJoin(brands, eq(models.brand_id, brands.id))
      .leftJoin(model_series, eq(models.model_series_id, model_series.id))
      .leftJoin(model_test_price_drops, eq(models.id, model_test_price_drops.model_id));

    if (includePublishedShops) {
      query = query.leftJoin(
        shop_models,
        and(
          eq(models.id, shop_models.model_id),
          eq(shop_models.is_published, 1)
        )
      );
    }

    const result = await query.where(
      and(
        eq(models.sef_url, slug),
        eq(models.tenant_id, tenant_id)
      )
    );

    if (!result[0]) return null;

    // Get translations separately
    const translations = await db
      .select({
        ...getTableColumns(model_translations),
        language: getTableColumns(languages)
      })
      .from(model_translations)
      .leftJoin(languages, eq(model_translations.language_id, languages.id))
      .where(eq(model_translations.model_id, result[0].id));

    return {
      ...result[0],
      translations
    };
  }

  async create(data: Omit<TModelCreate, 'translations'>) {
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

      const result = await db.insert(models).values(dbData as any);
      const insertId = result?.[0]?.insertId ?? 0;
      return this.findById(Number(insertId), false);
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('Duplicate entry for model');
      }
      throw error;
    }
  }

  async update(id: number, data: Partial<Omit<TModelUpdate, 'translations'>>) {
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

    await db.update(models)
      .set(dbData as any)
      .where(eq(models.id, id));
    return this.findById(id);
  }

  async delete(id: number) {
    await db.delete(model_translations).where(eq(model_translations.model_id, id));
    await db.delete(models).where(eq(models.id, id));
    return true;
  }

  async createTranslation(data: TModelTranslationInsert) {
    try {
      const dbData = removeUndefinedKeys(data);
      const result = await db.insert(model_translations).values(dbData as TModelTranslationInsert);
      const insertId = result?.[0]?.insertId ?? 0;
      return this.findTranslationById(Number(insertId));
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('Duplicate translation for this model and language');
      }
      throw error;
    }
  }

  async findTranslationById(id: number) {
    const result = await db
      .select({
        ...getTableColumns(model_translations),
        language: getTableColumns(languages)
      })
      .from(model_translations)
      .leftJoin(languages, eq(model_translations.language_id, languages.id))
      .where(eq(model_translations.id, id));
    
    return result[0] || null;
  }

  async findTranslation(modelId: number, languageId: number) {
    const result = await db
      .select()
      .from(model_translations)
      .where(
        and(
          eq(model_translations.model_id, modelId),
          eq(model_translations.language_id, languageId)
        )
      );
    
    return result[0] || null;
  }

  async findTranslationsForModel(modelId: number) {
    return db
      .select({
        ...getTableColumns(model_translations),
        language: getTableColumns(languages)
      })
      .from(model_translations)
      .leftJoin(languages, eq(model_translations.language_id, languages.id))
      .where(eq(model_translations.model_id, modelId));
  }

  async updateTranslation(id: number, data: Partial<Omit<TModelTranslationInsert, 'id' | 'model_id' | 'language_id'>>) {
    const dbData = removeUndefinedKeys(data);
    await db.update(model_translations)
      .set(dbData as any)
      .where(eq(model_translations.id, id));
    return this.findTranslationById(id);
  }

  async updateTranslationByModelAndLanguage(modelId: number, languageId: number, data: Partial<Omit<TModelTranslationInsert, 'model_id' | 'language_id'>>) {
    const dbData = removeUndefinedKeys(data);
    await db.update(model_translations)
        .set(dbData as any)
        .where(and(
            eq(model_translations.model_id, modelId),
            eq(model_translations.language_id, languageId)
        ));
    return this.findTranslation(modelId, languageId); // Return the updated translation
  }

  async deleteTranslation(modelId: number, languageId: number): Promise<boolean> {
    const result = await db.delete(model_translations)
        .where(and(
            eq(model_translations.model_id, modelId),
            eq(model_translations.language_id, languageId)
        ));
    const affectedRows = (result as unknown as { affectedRows?: number }).affectedRows;
    return affectedRows !== undefined && affectedRows > 0;
  }

  async deleteTranslationsForModel(modelId: number, excludeLanguageIds: number[] = []) {
    const whereClause = excludeLanguageIds.length > 0
      ? and(
          eq(model_translations.model_id, modelId),
          sql`${model_translations.language_id} NOT IN (${excludeLanguageIds.join(',')})`
        )
      : eq(model_translations.model_id, modelId);

    await db.delete(model_translations).where(whereClause);
    return true;
  }

  /**
   * Find models published in a specific shop with pagination and filtering
   * @param shopId Shop ID
   * @param page Page number
   * @param limit Items per page
   * @param orderBy Column to sort by
   * @param order Sort order
   * @param search Optional search term
   * @param categoryId Optional category filter
   * @param brandId Optional brand filter
   * @param modelSeriesId Optional model series filter
   * @param clientId Optional client ID filter
   * @returns Paginated list of models published in the shop
   */
  async findPublishedInShop(
    shopId: number,
    page = 1,
    limit = 20,
    orderBy = "title",
    order: "asc" | "desc" = "asc",
    search?: string,
    categoryId?: number,
    brandId?: number,
    modelSeriesId?: number,
    tenantId?: number
  ) {
    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions = [
      eq(shop_models.shop_id, shopId),
      eq(shop_models.is_published, 1)
    ];

    if (tenantId !== undefined) {
      whereConditions.push(eq(models.tenant_id, tenantId));
    }

    if (categoryId !== undefined) {
      whereConditions.push(eq(models.category_id, categoryId));
    }

    if (brandId !== undefined) {
      whereConditions.push(eq(models.brand_id, brandId));
    }

    if (modelSeriesId !== undefined) {
      whereConditions.push(eq(models.model_series_id, modelSeriesId));
    }

    // Add search condition if provided
    if (search && search.trim() !== '') {
      whereConditions.push(like(models.title, `%${search}%`));
    }

    const whereClause = and(...whereConditions);

    // Define mapping for orderBy
    const columnMapping = {
      id: models.id,
      title: models.title,
      model_image: models.model_image,
      sef_url: models.sef_url,
      meta_canonical_url: models.meta_canonical_url,
      meta_description: models.meta_description,
      meta_keywords: models.meta_keywords,
      base_price: models.base_price,
      tenant_id: models.tenant_id,
      createdAt: models.createdAt,
      updatedAt: models.updatedAt
    };

    // Default to title if invalid orderBy is provided
    if (!(orderBy in columnMapping)) {
      orderBy = "title";
    }

    // Execute the query with join on shopModels
    const [items, totalCount] = await Promise.all([
      db.select({
        id: models.id,
        title: models.title,
        model_image: models.model_image,
        sef_url: models.sef_url,
        meta_canonical_url: models.meta_canonical_url,
        meta_description: models.meta_description,
        meta_keywords: models.meta_keywords,
        base_price: models.base_price,
        shop_price: shop_models.base_price,
        tenant_id: models.tenant_id,
        category_id: models.category_id,
        brand_id: models.brand_id,
        model_series_id: models.model_series_id,
        tooltip_of_model: models.tooltip_of_model,
        searchable_words: models.searchable_words,
        createdAt: models.createdAt,
        updatedAt: models.updatedAt,
        is_published: shop_models.is_published
      })
      .from(models)
      .innerJoin(shop_models, eq(models.id, shop_models.model_id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(
        order === "asc"
          ? asc(columnMapping[orderBy as keyof typeof columnMapping])
          : desc(columnMapping[orderBy as keyof typeof columnMapping])
      ),

      db.select({ count: sql<number>`count(*)` })
        .from(models)
        .innerJoin(shop_models, eq(models.id, shop_models.model_id))
        .where(whereClause)
    ]);

    // Get translations for all items
    const modelsWithTranslations = await Promise.all(
      items.map(async (model) => {
        const translations = await this.findTranslationsForModel(Number(model.id));
        return {
          ...model,
          translations
        };
      })
    );

    return {
      data: modelsWithTranslations,
      meta: {
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    };
  }

  /**
   * Find a model by its SEF URL that is published in a specific shop, including its question set assignments
   * @param shopId The ID of the shop where the model is published
   * @param slug The SEF URL of the model
   * @returns The model with its question set assignments, or null if not found
   */
  async findPublishedModelBySlugInShop(shopId: number, slug: string) {
    // First check if the model exists and is published in the shop
    const publishedCheck = await db.select({
      modelId: models.id,
      tenantId: models.tenant_id
    })
    .from(models)
    .innerJoin(shop_models, and(
      eq(models.id, shop_models.model_id),
      eq(shop_models.shop_id, shopId),
      eq(shop_models.is_published, 1)
    ))
    .where(eq(models.sef_url, slug))
    .limit(1);

    if (publishedCheck.length === 0) {
      return null; // Model not found or not published in this shop
    }

    const modelId = publishedCheck[0].modelId;
    const tenantId = publishedCheck[0].tenantId;
    
    // Get the base model with joins
    const baseModel = await db
      .select({
        ...getTableColumns(models),
        category: getTableColumns(device_categories),
        brand: getTableColumns(brands),
        series: getTableColumns(model_series),
        testPriceDrops: getTableColumns(model_test_price_drops)
      })
      .from(models)
      .leftJoin(device_categories, eq(models.category_id, device_categories.id))
      .leftJoin(brands, eq(models.brand_id, brands.id))
      .leftJoin(model_series, eq(models.model_series_id, model_series.id))
      .leftJoin(model_test_price_drops, eq(models.id, model_test_price_drops.model_id))
      .where(
        and(
          eq(models.id, modelId),
          eq(models.tenant_id, tenantId)
        )
      );

    if (!baseModel[0]) return null;
    
    const model = baseModel[0];

    // Get translations
    const translations = await db
      .select({
        ...getTableColumns(model_translations),
        language: getTableColumns(languages)
      })
      .from(model_translations)
      .leftJoin(languages, eq(model_translations.language_id, languages.id))
      .where(eq(model_translations.model_id, modelId));

    // Get published shops info
    const publishedInShops = await db
      .select({
        shop_id: shop_models.shop_id,
        is_published: shop_models.is_published
      })
      .from(shop_models)
      .where(
        and(
          eq(shop_models.model_id, modelId),
          eq(shop_models.shop_id, shopId)
        )
      );

    // Get question set assignments with all nested data
    const questionSetAssignments = await db
      .select({
        ...getTableColumns(device_model_question_set_assignments),
        questionSet: getTableColumns(question_sets)
      })
      .from(device_model_question_set_assignments)
      .leftJoin(question_sets, eq(device_model_question_set_assignments.question_set_id, question_sets.id))
      .where(eq(device_model_question_set_assignments.model_id, modelId))
      .orderBy(asc(device_model_question_set_assignments.assignment_order));

    // For each question set, get its questions and options
    const enrichedAssignments = await Promise.all(
      questionSetAssignments.map(async (assignment) => {
        if (!assignment.questionSet) return assignment;
        
        // Get questions for this question set
        const questions = await db
          .select(getTableColumns(device_questions))
          .from(device_questions)
          .where(eq(device_questions.question_set_id, assignment.questionSet.id))
          .orderBy(asc(device_questions.order_no));

        const enrichedQuestions = await Promise.all(
          questions.map(async (question) => {
            // Get question options
            const options = await db
              .select(getTableColumns(question_options))
              .from(question_options)
              .where(eq(question_options.question_id, question.id))
              .orderBy(asc(question_options.order_no));

            return {
              ...question,
              options,
              translations: [] // Add empty array for now, can be populated if needed
            };
          })
        );

        return {
          ...assignment,
          questionSet: {
            ...assignment.questionSet,
            questions: enrichedQuestions,
            translations: [] // Add empty array for now
          }
        };
      })
    );

    const finalModel = {
      ...model,
      translations,
      publishedInShops,
      questionSetAssignments: enrichedAssignments
    };

    return finalModel;
  }
}

export const modelRepository = new ModelRepository();
