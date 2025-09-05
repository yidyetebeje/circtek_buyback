import { asc, desc, eq, and, sql, InferSelectModel, or, inArray, isNotNull, like } from "drizzle-orm";
import { db } from "../../db";
import { shops } from "../../db/shops.schema";
import { TShopCreate, TShopUpdate } from "../types/shopTypes";

// Helper to remove undefined keys from an object
function removeUndefinedKeys<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

export class ShopRepository {
  async findAll(
    page = 1,
    limit = 20,
    orderBy = "name", // Default order by name for shops
    order: "asc" | "desc" = "asc",
    tenantId?: number,
    ownerId?: number,
    allowedShopIds?: number[],
    active?: boolean,
    search?: string
  ) {
    const offset = (page - 1) * limit;

    const conditions = [];
    if (tenantId !== undefined) {
      conditions.push(eq(shops.tenant_id, tenantId));
    }
    if (ownerId !== undefined) {
      conditions.push(eq(shops.owner_id, ownerId));
    }
    if (active !== undefined) {
      conditions.push(eq(shops.active, active ? 1 : 0));
    }
    if (search !== undefined && search.trim().length > 0) {
      conditions.push(
        or(
          like(shops.name, `%${search.trim()}%`),
          like(shops.organization, `%${search.trim()}%`)
        )
      );
    }
    
    // Filter by allowed shop IDs if provided
    if (allowedShopIds && allowedShopIds.length > 0) {
      conditions.push(inArray(shops.id, allowedShopIds));
    }
    
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const columnMapping: { [key: string]: any } = {
      id: shops.id,
      name: shops.name,
      tenant_id: shops.tenant_id,
      owner_id: shops.owner_id,
      organization: shops.organization,
      phone: shops.phone,
      active: shops.active,
      createdAt: shops.created_at,
      updatedAt: shops.updated_at
    };

    if (!(orderBy in columnMapping)) {
      orderBy = "name";
    }
    const items = await db.select().from(shops).where(whereCondition).limit(limit).offset(offset).orderBy(order === "asc"
      ? asc(columnMapping[orderBy])
      : desc(columnMapping[orderBy]));

    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(shops)
      .where(whereCondition);
    
    const total = totalCountResult[0]?.count ?? 0;

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findById(id: number) {
    const result = await db.select().from(shops).where(eq(shops.id, id)).limit(1);
    return result[0] || null;
  }

  async create(data: TShopCreate) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL datetime format
    const dbData = {
      ...removeUndefinedKeys(data),
      createdAt: now,
      updatedAt: now
    };

    const result = await db.insert(shops).values(dbData as any); // Drizzle might need type assertion here
    const insertId = result?.[0]?.insertId ?? 0;
    if (insertId === 0) return null; // Or throw error
    return this.findById(Number(insertId));
  }

  async update(id: number, data: TShopUpdate) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL datetime format
    const dbData = {
      ...removeUndefinedKeys(data),
      updatedAt: now
    };

    await db.update(shops)
      .set(dbData as any) // Drizzle might need type assertion here
      .where(eq(shops.id, id));
    return this.findById(id);
  }

  async delete(id: number) {
    const result = await db.delete(shops).where(eq(shops.id, id));
    // For mysql2 driver, the result object should have affectedRows
    // The type MySqlRawQueryResult might be a generic one, 
    // but the actual result from mysql2 contains affectedRows.
    return (result as any).affectedRows > 0;
  }

  async findConfigByShopId(id: number): Promise<{ id: number; config: any } | null> {
    const result = await db.select({
      id: shops.id,
      config: shops.config
    }).from(shops).where(eq(shops.id, id)).limit(1);
    return result[0] || null;
  }

  async updateConfig(id: number, configValue: any): Promise<InferSelectModel<typeof shops> | undefined> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.update(shops)
      .set({ 
        config: configValue,
        updated_at: now 
      })
      .where(eq(shops.id, id));
    const result = await this.findById(id);
    return result || undefined;
  }
}

export const shopRepository = new ShopRepository(); 