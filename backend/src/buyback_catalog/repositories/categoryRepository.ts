import { asc, desc, eq, and, sql, inArray, like, getTableColumns } from "drizzle-orm";
import { db } from "../../db";
import { device_categories } from "../../db/buyback_catalogue.schema";
import { device_categories_translations, shop_device_categories } from "../../db/shops.schema";
import { languages } from "../../db/buyback_catalogue.schema";
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
    tenantId?: number,
    includePublishedShops = true
  ) {
    const offset = (page - 1) * limit;
    
    // Build where clause based on filters
    const whereCondition = tenantId 
      ? eq(device_categories.tenant_id, tenantId)
      : undefined;
    
    // Create a column mapping for type safety
    const columnMapping = {
      id: device_categories.id,
      title: device_categories.title,
      icon: device_categories.icon,
      description: device_categories.description,
      meta_title: device_categories.meta_title,
      sef_url: device_categories.sef_url,
      order_no: device_categories.order_no,
      meta_canonical_url: device_categories.meta_canonical_url,
      meta_description: device_categories.meta_description,
      meta_keywords: device_categories.meta_keywords,
      tenant_id: device_categories.tenant_id,
      createdAt: device_categories.createdAt,
      updatedAt: device_categories.updatedAt
    };
    
    // Make sure orderBy is a valid column
    if (!(orderBy in columnMapping)) {
      orderBy = "order_no"; // Default to a safe column if invalid
    }
    
    const [items, totalCount] = await Promise.all([
      db.select({
        ...getTableColumns(device_categories),
        translations: sql<any[]>`JSON_ARRAYAGG(JSON_OBJECT(
          'id', ${device_categories_translations.id},
          'title', ${device_categories_translations.title},
          'description', ${device_categories_translations.description},
          'language_id', ${device_categories_translations.language_id}
        ))`
      })
        .from(device_categories)
        .leftJoin(device_categories_translations, eq(device_categories.id, device_categories_translations.category_id))
        .where(whereCondition || sql`1=1`)
        .groupBy(device_categories.id)
        .limit(limit)
        .offset(offset)
        .orderBy(
          order === "asc" 
            ? asc(columnMapping[orderBy as keyof typeof columnMapping])
            : desc(columnMapping[orderBy as keyof typeof columnMapping])
        ),
      db.select({ count: sql<number>`count(*)` })
        .from(device_categories)
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
    const result = await db
      .select({
        ...getTableColumns(device_categories),
        ...(includeTranslations ? {
          translations: sql<any[]>`JSON_ARRAYAGG(JSON_OBJECT(
            'id', ${device_categories_translations.id},
            'title', ${device_categories_translations.title},
            'description', ${device_categories_translations.description},
            'language_id', ${device_categories_translations.language_id}
          ))`
        } : {})
      })
      .from(device_categories)
      .leftJoin(device_categories_translations, includeTranslations ? eq(device_categories.id, device_categories_translations.category_id) : sql`FALSE`)
      .where(eq(device_categories.id, id))
      .groupBy(device_categories.id)
      .limit(1);
    
    return result[0] || null;
  }

  async findBySlug(slug: string, tenantId: number, includePublishedShops = true) {
    const result = await db
      .select({
        ...getTableColumns(device_categories),
        translations: sql<any[]>`JSON_ARRAYAGG(JSON_OBJECT(
          'id', ${device_categories_translations.id},
          'title', ${device_categories_translations.title},
          'description', ${device_categories_translations.description},
          'language_id', ${device_categories_translations.language_id}
        ))`
      })
      .from(device_categories)
      .leftJoin(device_categories_translations, eq(device_categories.id, device_categories_translations.category_id))
      .where(and(
        eq(device_categories.sef_url, slug),
        eq(device_categories.tenant_id, tenantId)
      ))
      .groupBy(device_categories.id)
      .limit(1);
    
    return result[0] || null;
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
      const result = await db.insert(device_categories).values(dbData as any);
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
    
    await db.update(device_categories)
      .set({
        ...data,
        updatedAt: formattedDate
      })
      .where(eq(device_categories.id, id));
    
    return this.findById(id);
  }

  async delete(id: number) {
    // First delete all translations
    await db.delete(device_categories_translations)
      .where(eq(device_categories_translations.category_id, id));
    
    // Then delete the category
    await db.delete(device_categories)
      .where(eq(device_categories.id, id));
    
    return true;
  }

  // Translation-related methods
  async createTranslation(data: TCategoryTranslationCreate) {
    try {
      const dbData = removeUndefinedKeys(data);
      const result = await db.insert(device_categories_translations).values(dbData as TCategoryTranslationCreate);
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
    const result = await db
      .select()
      .from(device_categories_translations)
      .where(eq(device_categories_translations.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  async findTranslation(categoryId: number, languageId: number) {
    const result = await db
      .select()
      .from(device_categories_translations)
      .where(and(
        eq(device_categories_translations.category_id, categoryId),
        eq(device_categories_translations.language_id, languageId)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  async updateTranslation(id: number, data: Partial<Omit<TCategoryTranslationCreate, 'category_id' | 'language_id'>>) {
    await db.update(device_categories_translations)
      .set(data)
      .where(eq(device_categories_translations.id, id));
    
    return this.findTranslationById(id);
  }

  async deleteTranslation(id: number) {
    await db.delete(device_categories_translations)
      .where(eq(device_categories_translations.id, id));
    
    return true;
  }

  async findTranslationsForCategory(categoryId: number) {
    return db
      .select({
        id: device_categories_translations.id,
        category_id: device_categories_translations.category_id,
        language_id: device_categories_translations.language_id,
        title: device_categories_translations.title,
        description: device_categories_translations.description,
        meta_title: device_categories_translations.meta_title,
        meta_description: device_categories_translations.meta_description,
        meta_keywords: device_categories_translations.meta_keywords,
        language: {
          id: languages.id,
          name: languages.name,
          code: languages.code
        }
      })
      .from(device_categories_translations)
      .leftJoin(languages, eq(device_categories_translations.language_id, languages.id))
      .where(eq(device_categories_translations.category_id, categoryId));
  }

  async deleteTranslationsForCategory(categoryId: number, excludeLanguageIds: number[] = []) {
    const whereClause = excludeLanguageIds.length > 0
      ? and(
          eq(device_categories_translations.category_id, categoryId),
          sql`${device_categories_translations.language_id} NOT IN (${excludeLanguageIds.join(',')})`
        )
      : eq(device_categories_translations.category_id, categoryId);
      
    await db.delete(device_categories_translations)
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
   * @param tenantId Optional tenant ID filter
   * @returns Paginated list of categories published in the shop
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
      eq(shop_device_categories.shop_id, shopId),
      eq(shop_device_categories.is_published, 1)
    ];

    if (tenantId !== undefined) {
      whereConditions.push(eq(device_categories.tenant_id, tenantId));
    }

    // Add search condition if provided
    if (search && search.trim() !== '') {
      whereConditions.push(like(device_categories.title, `%${search}%`));
    }

    const whereClause = and(...whereConditions);

    // Define mapping for orderBy
    const columnMapping = {
      id: device_categories.id,
      title: device_categories.title,
      icon: device_categories.icon,
      description: device_categories.description,
      meta_title: device_categories.meta_title,
      sef_url: device_categories.sef_url,
      order_no: device_categories.order_no,
      meta_canonical_url: device_categories.meta_canonical_url,
      meta_description: device_categories.meta_description,
      meta_keywords: device_categories.meta_keywords,
      tenant_id: device_categories.tenant_id,
      createdAt: device_categories.createdAt,
      updatedAt: device_categories.updatedAt
    };

    // Default to title if invalid orderBy is provided
    if (!(orderBy in columnMapping)) {
      orderBy = "title";
    }

    // Execute the query with join on shop_device_categories
    const [items, totalCount] = await Promise.all([
      db.select({
        id: device_categories.id,
        title: device_categories.title,
        icon: device_categories.icon,
        description: device_categories.description,
        meta_title: device_categories.meta_title,
        sef_url: device_categories.sef_url,
        meta_canonical_url: device_categories.meta_canonical_url,
        meta_description: device_categories.meta_description,
        meta_keywords: device_categories.meta_keywords,
        order_no: device_categories.order_no,
        tenant_id: device_categories.tenant_id,
        createdAt: device_categories.createdAt,
        updatedAt: device_categories.updatedAt,
        is_published: shop_device_categories.is_published
      })
      .from(device_categories)
      .innerJoin(shop_device_categories, eq(device_categories.id, shop_device_categories.category_id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(
        order === "asc"
          ? asc(columnMapping[orderBy as keyof typeof columnMapping])
          : desc(columnMapping[orderBy as keyof typeof columnMapping])
      ),

      db.select({ count: sql<number>`count(*)` })
        .from(device_categories)
        .innerJoin(shop_device_categories, eq(device_categories.id, shop_device_categories.category_id))
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
