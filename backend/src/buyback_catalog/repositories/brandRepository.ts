import { asc, desc, eq, and, sql, inArray, like, getTableColumns } from "drizzle-orm";
import { db } from "../../db";
import { brands } from "../../db/buyback_catalogue.schema";
import { brand_translations } from "../../db/shops.schema";
import { languages } from "../../db/buyback_catalogue.schema";
import { shop_brands } from "../../db/shops.schema";
import { TBrandCreate, TBrandUpdate, TBrandTranslationCreate, TBrandTranslationInsert } from "../types/brandTypes";
import { toSafeUrl } from "../utils/urlUtils";
import { ConflictError } from "../utils/errors";

// Helper to remove undefined keys from an object
function removeUndefinedKeys<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

export class BrandRepository {
  async findAll(
    page = 1,
    limit = 20,
    orderBy = "order_no",
    order: "asc" | "desc" = "asc",
    tenantId?: number,
    includeTranslations = true,
    includePublishedShops = true
  ) {
    const offset = (page - 1) * limit;

    let whereConditions: any[] = [];
    
    if (tenantId !== undefined) {
      whereConditions.push(eq(brands.tenant_id, tenantId));
    }

    const whereCondition = whereConditions.length > 0 
      ? and(...whereConditions)
      : undefined;

    const columnMapping = {
      id: brands.id,
      title: brands.title,
      icon: brands.icon,
      description: brands.description,
      meta_title: brands.meta_title,
      sef_url: brands.sef_url,
      meta_canonical_url: brands.meta_canonical_url,
      meta_description: brands.meta_description,
      meta_keywords: brands.meta_keywords,
      order_no: brands.order_no,
      tenant_id: brands.tenant_id,
      createdAt: brands.createdAt,
      updatedAt: brands.updatedAt
    };

    if (!(orderBy in columnMapping)) {
      orderBy = "order_no";
    }

    // Build query conditionally to avoid type issues
    const baseQuery = db
      .select({
        ...getTableColumns(brands),
        testPriceDrops: sql`NULL` // Placeholder for consistency
      })
      .from(brands);
    
    const query = includePublishedShops
      ? baseQuery.leftJoin(
          shop_brands,
          and(
            eq(brands.id, shop_brands.brand_id),
            eq(shop_brands.is_published, 1)
          )
        )
      : baseQuery;

    const [items, totalCount] = await Promise.all([
      query
        .where(whereCondition ? whereCondition : sql`1=1`)
        .limit(limit)
        .offset(offset)
        .orderBy(order === "asc" ? asc(columnMapping[orderBy as keyof typeof columnMapping]) : desc(columnMapping[orderBy as keyof typeof columnMapping])),
      db.select({ count: sql<number>`count(*)` })
        .from(brands)
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
    // Get the base brand record
    const brandResult = await db
      .select(getTableColumns(brands))
      .from(brands)
      .where(eq(brands.id, id));
    
    if (!brandResult[0]) return null;
    
    let response: any = brandResult[0];
    
    // Add translations if requested
    if (includeTranslations) {
      const translations = await db
        .select(getTableColumns(brand_translations))
        .from(brand_translations)
        .where(eq(brand_translations.brand_id, id));
      response.brand_translations = translations;
    }
    
    // Add shop brands if requested
    if (includePublishedShops) {
      const shopBrands = await db
        .select(getTableColumns(shop_brands))
        .from(shop_brands)
        .where(eq(shop_brands.brand_id, id));
      response.shop_brands = shopBrands;
    }
    
    return response;
  }

  async findBySlug(slug: string, tenantId: number, includePublishedShops = true) {
    const baseQuery = db
      .select({
        ...getTableColumns(brands)
      })
      .from(brands);

    const query = includePublishedShops
      ? baseQuery.leftJoin(
          shop_brands,
          and(
            eq(brands.id, shop_brands.brand_id),
            eq(shop_brands.is_published, 1)
          )
        )
      : baseQuery;

    const result = await query.where(
      and(
        eq(brands.sef_url, slug),
        eq(brands.tenant_id, tenantId)
      )
    );

    if (!result[0]) return null;

    // Get translations separately
    const translations = await db
      .select({
        ...getTableColumns(brand_translations),
        language: getTableColumns(languages)
      })
      .from(brand_translations)
      .leftJoin(languages, eq(brand_translations.language_id, languages.id))
      .where(eq(brand_translations.brand_id, result[0].id));

    return {
      ...result[0],
      translations
    };
  }

  async create(data: Omit<TBrandCreate, 'translations'>) {
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

      const result = await db.insert(brands).values(dbData as any);
      const insertId = result?.[0]?.insertId ?? 0;
      return this.findById(Number(insertId), false);
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('Duplicate entry for brand');
      }
      throw error;
    }
  }

  async update(id: number, data: Partial<Omit<TBrandUpdate, 'translations'>>) {
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

    await db.update(brands)
      .set(dbData as any)
      .where(eq(brands.id, id));
    return this.findById(id);
  }

  async delete(id: number) {
    await db.delete(brand_translations).where(eq(brand_translations.brand_id, id));
    await db.delete(brands).where(eq(brands.id, id));
    return true;
  }

  async createTranslation(data: TBrandTranslationInsert) {
    try {
      const dbData = removeUndefinedKeys(data);
      const result = await db.insert(brand_translations).values(dbData as TBrandTranslationInsert);
      const insertId = result?.[0]?.insertId ?? 0;
      return this.findTranslationById(Number(insertId));
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('Duplicate translation for this brand and language');
      }
      throw error;
    }
  }

  async findTranslationById(id: number) {
    const result = await db
      .select({
        ...getTableColumns(brand_translations),
        language: getTableColumns(languages)
      })
      .from(brand_translations)
      .leftJoin(languages, eq(brand_translations.language_id, languages.id))
      .where(eq(brand_translations.id, id));
    
    return result[0] || null;
  }

  async findTranslation(brandId: number, languageId: number) {
    const result = await db
      .select()
      .from(brand_translations)
      .where(
        and(
          eq(brand_translations.brand_id, brandId),
          eq(brand_translations.language_id, languageId)
        )
      );
    
    return result[0] || null;
  }

  async findTranslationsForBrand(brandId: number) {
    return db
      .select({
        ...getTableColumns(brand_translations),
        language: getTableColumns(languages)
      })
      .from(brand_translations)
      .leftJoin(languages, eq(brand_translations.language_id, languages.id))
      .where(eq(brand_translations.brand_id, brandId));
  }

  async updateTranslation(id: number, data: Partial<Omit<TBrandTranslationInsert, 'id' | 'brand_id' | 'language_id'>>) {
    const dbData = removeUndefinedKeys(data);
    await db.update(brand_translations)
      .set(dbData)
      .where(eq(brand_translations.id, id));
    return this.findTranslationById(id);
  }

  async deleteTranslation(id: number) {
    await db.delete(brand_translations).where(eq(brand_translations.id, id));
    return true;
  }

  async deleteTranslationsForBrand(brandId: number, excludeLanguageIds: number[] = []) {
    const whereClause = excludeLanguageIds.length > 0
      ? and(
          eq(brand_translations.brand_id, brandId),
          sql`${brand_translations.language_id} NOT IN (${excludeLanguageIds.join(',')})`
        )
      : eq(brand_translations.brand_id, brandId);

    await db.delete(brand_translations).where(whereClause);
    return true;
  }

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
      eq(shop_brands.shop_id, shopId),
      eq(shop_brands.is_published, 1)
    ];

    if (tenantId !== undefined) {
      whereConditions.push(eq(brands.tenant_id, tenantId));
    }

    // Add search condition if provided
    if (search && search.trim() !== '') {
      // Just search by title to avoid issues with nullable description
      whereConditions.push(like(brands.title, `%${search}%`));
    }

    const whereClause = and(...whereConditions);

    // Define mapping for orderBy
    const columnMapping = {
      id: brands.id,
      title: brands.title,
      icon: brands.icon,
      description: brands.description,
      meta_title: brands.meta_title,
      sef_url: brands.sef_url,
      meta_canonical_url: brands.meta_canonical_url,
      meta_description: brands.meta_description,
      meta_keywords: brands.meta_keywords,
      order_no: brands.order_no,
      tenant_id: brands.tenant_id,
      createdAt: brands.createdAt,
      updatedAt: brands.updatedAt
    };

    // Default to title if invalid orderBy is provided
    if (!(orderBy in columnMapping)) {
      orderBy = "title";
    }

    // Execute the query with join on shopBrands
    const [items, totalCount] = await Promise.all([
      db.select({
        id: brands.id,
        title: brands.title,
        icon: brands.icon,
        description: brands.description,
        meta_title: brands.meta_title,
        sef_url: brands.sef_url,
        meta_canonical_url: brands.meta_canonical_url,
        meta_description: brands.meta_description,
        meta_keywords: brands.meta_keywords,
        order_no: brands.order_no,
        tenant_id: brands.tenant_id,
        createdAt: brands.createdAt,
        updatedAt: brands.updatedAt,
        is_published: shop_brands.is_published
      })
      .from(brands)
      .innerJoin(shop_brands, eq(brands.id, shop_brands.brand_id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(
        order === "asc"
          ? asc(columnMapping[orderBy as keyof typeof columnMapping])
          : desc(columnMapping[orderBy as keyof typeof columnMapping])
      ),

      db.select({ count: sql<number>`count(*)` })
        .from(brands)
        .innerJoin(shop_brands, eq(brands.id, shop_brands.brand_id))
        .where(whereClause)
    ]);

    // Get translations for all items
    const brandsWithTranslations = await Promise.all(
      items.map(async (brand) => {
        const translations = await this.findTranslationsForBrand(Number(brand.id));
        return {
          ...brand,
          translations
        };
      })
    );

    return {
      data: brandsWithTranslations,
      meta: {
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    };
  }
}

export const brandRepository = new BrandRepository();
