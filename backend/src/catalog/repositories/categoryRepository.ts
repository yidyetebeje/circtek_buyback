import { asc, desc, eq, and, sql, inArray, like } from "drizzle-orm";
import { db } from "../../db";
import { deviceCategories, deviceCategoryTranslations, shopDeviceCategories } from "../../db/schema/catalog";
import { TCategoryCreate, TCategoryUpdate, TCategoryTranslationCreate } from "../types/categoryTypes";
import { toSafeUrl } from "../utils/urlUtils";
import { ConflictError } from "../utils/errors";

// Helper to strip undefined values
function removeUndefinedKeys<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

export class CategoryRepository {
  async findAll(
    page = 1, 
    limit = 20, 
    orderBy = "order_no", 
    order: "asc" | "desc" = "asc",
    clientId?: number,
    includePublishedShops = true
  ) {
    const offset = (page - 1) * limit;
    
    // Build where clause based on filters
    const whereCondition = clientId 
      ? eq(deviceCategories.client_id, clientId)
      : undefined;
    
    // Create a column mapping for type safety
    const columnMapping = {
      id: deviceCategories.id,
      title: deviceCategories.title,
      icon: deviceCategories.icon,
      description: deviceCategories.description,
      meta_title: deviceCategories.meta_title,
      sef_url: deviceCategories.sef_url,
      order_no: deviceCategories.order_no,
      meta_canonical_url: deviceCategories.meta_canonical_url,
      meta_description: deviceCategories.meta_description,
      meta_keywords: deviceCategories.meta_keywords,
      client_id: deviceCategories.client_id,
      createdAt: deviceCategories.createdAt,
      updatedAt: deviceCategories.updatedAt
    };
    
    // Make sure orderBy is a valid column
    if (!(orderBy in columnMapping)) {
      orderBy = "order_no"; // Default to a safe column if invalid
    }
    
    const [items, totalCount] = await Promise.all([
      db.query.deviceCategories.findMany({
        where: whereCondition,
        limit,
        offset,
        orderBy: order === "asc" 
          ? asc(columnMapping[orderBy as keyof typeof columnMapping])
          : desc(columnMapping[orderBy as keyof typeof columnMapping]),
        with: {
          translations: true,
          ...(includePublishedShops ? {
            publishedInShops: {
              where: eq(shopDeviceCategories.is_published, 1),
              columns: {
                shop_id: true
              }
            }
          } : {})
        }
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(deviceCategories)
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
    return db.query.deviceCategories.findFirst({
      where: eq(deviceCategories.id, id),
      with: {
        translations: includeTranslations ? true : undefined,
        ...(includePublishedShops ? {
          publishedInShops: {
            where: eq(shopDeviceCategories.is_published, 1),
            columns: {
              shop_id: true
            }
          }
        } : {})
      }
    });
  }

  async findBySlug(slug: string, clientId: number, includePublishedShops = true) {
    return db.query.deviceCategories.findFirst({
      where: and(
        eq(deviceCategories.sef_url, slug),
        eq(deviceCategories.client_id, clientId)
      ),
      with: {
        translations: true,
        ...(includePublishedShops ? {
          publishedInShops: {
            where: eq(shopDeviceCategories.is_published, 1),
            columns: {
              shop_id: true
            }
          }
        } : {})
      }
    });
  }

  async create(data: Omit<TCategoryCreate, 'translations'>) {
    try {
      const now = new Date();
      const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);
      if (!data.sef_url && data.title) {
        data.sef_url = toSafeUrl(data.title);
      }
      const dbData = {
        ...removeUndefinedKeys(data),
        createdAt: formattedDate,
        updatedAt: formattedDate
      };
      const result = await db.insert(deviceCategories).values(dbData as any);
      const insertId = result?.[0]?.insertId ?? 0;
      return this.findById(Number(insertId), false);
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('Duplicate entry for category');
      }
      throw error;
    }
  }

  async update(id: number, data: TCategoryUpdate) {
    // Format date in MySQL format (YYYY-MM-DD HH:MM:SS)
    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Generate SEF URL from title if title is provided but sef_url is not
    if (data.title && data.sef_url === undefined) {
      data.sef_url = toSafeUrl(data.title);
    }
    
    await db.update(deviceCategories)
      .set({
        ...data,
        updatedAt: formattedDate
      })
      .where(eq(deviceCategories.id, id));
    
    return this.findById(id);
  }

  async delete(id: number) {
    // First delete all translations
    await db.delete(deviceCategoryTranslations)
      .where(eq(deviceCategoryTranslations.category_id, id));
    
    // Then delete the category
    await db.delete(deviceCategories)
      .where(eq(deviceCategories.id, id));
    
    return true;
  }

  // Translation-related methods
  async createTranslation(data: TCategoryTranslationCreate) {
    try {
      const dbData = removeUndefinedKeys(data);
      const result = await db.insert(deviceCategoryTranslations).values(dbData as TCategoryTranslationCreate);
      const insertId = result?.[0]?.insertId ?? 0;
      return this.findTranslationById(Number(insertId));
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('Duplicate translation for this category and language');
      }
      throw error;
    }
  }

  async findTranslationById(id: number) {
    return db.query.deviceCategoryTranslations.findFirst({
      where: eq(deviceCategoryTranslations.id, id)
    });
  }

  async findTranslation(categoryId: number, languageId: number) {
    return db.query.deviceCategoryTranslations.findFirst({
      where: and(
        eq(deviceCategoryTranslations.category_id, categoryId),
        eq(deviceCategoryTranslations.language_id, languageId)
      )
    });
  }

  async updateTranslation(id: number, data: Partial<Omit<TCategoryTranslationCreate, 'category_id' | 'language_id'>>) {
    await db.update(deviceCategoryTranslations)
      .set(data)
      .where(eq(deviceCategoryTranslations.id, id));
    
    return this.findTranslationById(id);
  }

  async deleteTranslation(id: number) {
    await db.delete(deviceCategoryTranslations)
      .where(eq(deviceCategoryTranslations.id, id));
    
    return true;
  }

  async findTranslationsForCategory(categoryId: number) {
    return db.query.deviceCategoryTranslations.findMany({
      where: eq(deviceCategoryTranslations.category_id, categoryId),
      with: {
        language: true
      }
    });
  }

  async deleteTranslationsForCategory(categoryId: number, excludeLanguageIds: number[] = []) {
    const whereClause = excludeLanguageIds.length > 0
      ? and(
          eq(deviceCategoryTranslations.category_id, categoryId),
          sql`${deviceCategoryTranslations.language_id} NOT IN (${excludeLanguageIds.join(',')})`
        )
      : eq(deviceCategoryTranslations.category_id, categoryId);
      
    await db.delete(deviceCategoryTranslations)
      .where(whereClause);
    
    return true;
  }

  /**
   * Find categories published in a specific shop with pagination and filtering
   * @param shopId Shop ID
   * @param page Page number
   * @param limit Items per page
   * @param orderBy Column to sort by
   * @param order Sort order
   * @param search Optional search term
   * @param clientId Optional client ID filter
   * @returns Paginated list of categories published in the shop
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
      eq(shopDeviceCategories.shop_id, shopId),
      eq(shopDeviceCategories.is_published, 1)
    ];

    if (clientId !== undefined) {
      whereConditions.push(eq(deviceCategories.client_id, clientId));
    }

    // Add search condition if provided
    if (search && search.trim() !== '') {
      whereConditions.push(like(deviceCategories.title, `%${search}%`));
    }

    const whereClause = and(...whereConditions);

    // Define mapping for orderBy
    const columnMapping = {
      id: deviceCategories.id,
      title: deviceCategories.title,
      icon: deviceCategories.icon,
      description: deviceCategories.description,
      meta_title: deviceCategories.meta_title,
      sef_url: deviceCategories.sef_url,
      order_no: deviceCategories.order_no,
      meta_canonical_url: deviceCategories.meta_canonical_url,
      meta_description: deviceCategories.meta_description,
      meta_keywords: deviceCategories.meta_keywords,
      client_id: deviceCategories.client_id,
      createdAt: deviceCategories.createdAt,
      updatedAt: deviceCategories.updatedAt
    };

    // Default to title if invalid orderBy is provided
    if (!(orderBy in columnMapping)) {
      orderBy = "title";
    }

    // Execute the query with join on shopDeviceCategories
    const [items, totalCount] = await Promise.all([
      db.select({
        id: deviceCategories.id,
        title: deviceCategories.title,
        icon: deviceCategories.icon,
        description: deviceCategories.description,
        meta_title: deviceCategories.meta_title,
        sef_url: deviceCategories.sef_url,
        meta_canonical_url: deviceCategories.meta_canonical_url,
        meta_description: deviceCategories.meta_description,
        meta_keywords: deviceCategories.meta_keywords,
        order_no: deviceCategories.order_no,
        client_id: deviceCategories.client_id,
        createdAt: deviceCategories.createdAt,
        updatedAt: deviceCategories.updatedAt,
        is_published: shopDeviceCategories.is_published
      })
      .from(deviceCategories)
      .innerJoin(shopDeviceCategories, eq(deviceCategories.id, shopDeviceCategories.category_id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(
        order === "asc"
          ? asc(columnMapping[orderBy as keyof typeof columnMapping])
          : desc(columnMapping[orderBy as keyof typeof columnMapping])
      ),

      db.select({ count: sql<number>`count(*)` })
        .from(deviceCategories)
        .innerJoin(shopDeviceCategories, eq(deviceCategories.id, shopDeviceCategories.category_id))
        .where(whereClause)
    ]);

    // Get translations for all items
    const categoriesWithTranslations = await Promise.all(
      items.map(async (category) => {
        const translations = await this.findTranslationsForCategory(Number(category.id));
        return {
          ...category,
          translations
        };
      })
    );

    return {
      data: categoriesWithTranslations,
      meta: {
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    };
  }
}

export const categoryRepository = new CategoryRepository();
