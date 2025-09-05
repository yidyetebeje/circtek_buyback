import { asc, desc, eq, and, sql, inArray, or, like, ilike } from "drizzle-orm";
import { db } from "../../db";
import { brands, brandTranslations, languages, shopBrands } from "../../db/schema/catalog";
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
    clientId?: number,
    includeTranslations = true,
    includePublishedShops = true
  ) {
    const offset = (page - 1) * limit;

    const whereCondition = clientId ? eq(brands.client_id, clientId) : undefined;

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
      client_id: brands.client_id,
      createdAt: brands.createdAt,
      updatedAt: brands.updatedAt
    };

    if (!(orderBy in columnMapping)) {
      orderBy = "order_no";
    }

    const [items, totalCount] = await Promise.all([
      db.query.brands.findMany({
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
              where: eq(shopBrands.is_published, 1),
              columns: {
                shop_id: true
              }
            }
          } : {})
        }
      }),
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
    return db.query.brands.findFirst({
      where: eq(brands.id, id),
      with: {
        translations: includeTranslations ? true : undefined,
        ...(includePublishedShops ? {
          publishedInShops: {
            where: eq(shopBrands.is_published, 1),
            columns: {
              shop_id: true
            }
          }
        } : {})
      }
    });
  }

  async findBySlug(slug: string, clientId: number, includePublishedShops = true) {
    return db.query.brands.findFirst({
      where: and(
        eq(brands.sef_url, slug),
        eq(brands.client_id, clientId)
      ),
      with: {
        translations: true,
        ...(includePublishedShops ? {
          publishedInShops: {
            where: eq(shopBrands.is_published, 1),
            columns: {
              shop_id: true
            }
          }
        } : {})
      }
    });
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
    await db.delete(brandTranslations).where(eq(brandTranslations.brand_id, id));
    await db.delete(brands).where(eq(brands.id, id));
    return true;
  }

  async createTranslation(data: TBrandTranslationInsert) {
    try {
      const dbData = removeUndefinedKeys(data);
      const result = await db.insert(brandTranslations).values(dbData as TBrandTranslationInsert);
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
    return db.query.brandTranslations.findFirst({
      where: eq(brandTranslations.id, id),
      with: { language: true }
    });
  }

  async findTranslation(brandId: number, languageId: number) {
    return db.query.brandTranslations.findFirst({
      where: and(
        eq(brandTranslations.brand_id, brandId),
        eq(brandTranslations.language_id, languageId)
      )
    });
  }

  async findTranslationsForBrand(brandId: number) {
    return db.query.brandTranslations.findMany({
      where: eq(brandTranslations.brand_id, brandId),
      with: {
        language: true
      }
    });
  }

  async updateTranslation(id: number, data: Partial<Omit<TBrandTranslationInsert, 'id' | 'brand_id' | 'language_id'>>) {
    const dbData = removeUndefinedKeys(data);
    await db.update(brandTranslations)
      .set(dbData)
      .where(eq(brandTranslations.id, id));
    return this.findTranslationById(id);
  }

  async deleteTranslation(id: number) {
    await db.delete(brandTranslations).where(eq(brandTranslations.id, id));
    return true;
  }

  async deleteTranslationsForBrand(brandId: number, excludeLanguageIds: number[] = []) {
    const whereClause = excludeLanguageIds.length > 0
      ? and(
          eq(brandTranslations.brand_id, brandId),
          sql`${brandTranslations.language_id} NOT IN (${excludeLanguageIds.join(',')})`
        )
      : eq(brandTranslations.brand_id, brandId);

    await db.delete(brandTranslations).where(whereClause);
    return true;
  }

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
      eq(shopBrands.shop_id, shopId),
      eq(shopBrands.is_published, 1)
    ];

    if (clientId !== undefined) {
      whereConditions.push(eq(brands.client_id, clientId));
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
      client_id: brands.client_id,
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
        client_id: brands.client_id,
        createdAt: brands.createdAt,
        updatedAt: brands.updatedAt,
        is_published: shopBrands.is_published
      })
      .from(brands)
      .innerJoin(shopBrands, eq(brands.id, shopBrands.brand_id))
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
        .innerJoin(shopBrands, eq(brands.id, shopBrands.brand_id))
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
