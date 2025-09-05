import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { languages } from "../../db/buyback_catalogue.schema";
import { TLanguageCreate, TLanguageUpdate } from "../types/languageTypes";

// Define a type-safe function to get order column
function getOrderColumn(columnName: string) {
  // Ensure we're only using valid columns
  switch(columnName) {
    case "id":
      return languages.id;
    case "code":
      return languages.code;
    case "name":
      return languages.name;
    case "is_default":
      return languages.is_default;
    case "is_active":
      return languages.is_active;
    case "createdAt":
      return languages.createdAt;
    case "updatedAt":
      return languages.updatedAt;
    default:
      return languages.id; // Default to id if invalid column name is provided
  }
}

export class LanguageRepository {
  async findAll(page = 1, limit = 20, orderBy = "id", order: "asc" | "desc" = "asc") {
    const offset = (page - 1) * limit;
    
    const orderClause = order === "asc" 
      ? asc(getOrderColumn(orderBy))
      : desc(getOrderColumn(orderBy));
    
    const [items, totalCount] = await Promise.all([
      db.select().from(languages)
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(languages)
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

  async findById(id: number) {
    const [result] = await db.select().from(languages)
      .where(eq(languages.id, id))
      .limit(1);
    return result || null;
  }

  async findByCode(code: string) {
    const [result] = await db.select().from(languages)
      .where(eq(languages.code, code))
      .limit(1);
    return result || null;
  }

  async create(data: TLanguageCreate) {
    const result = await db.insert(languages).values({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return this.findById(Number(result[0].insertId));
  }

  async update(id: number, data: TLanguageUpdate) {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    await db.update(languages)
      .set(updateData)
      .where(eq(languages.id, id));
    
    return this.findById(id);
  }

  async delete(id: number) {
    await db.delete(languages).where(eq(languages.id, id));
    return true;
  }

  async setDefault(id: number) {
    // First reset all languages to non-default
    await db.update(languages)
      .set({ is_default: 0 })
      .where(sql`1=1`);
    
    // Then set the specified language as default
    await db.update(languages)
      .set({ is_default: 1 })
      .where(eq(languages.id, id));
    
    return this.findById(id);
  }
}

export const languageRepository = new LanguageRepository();
