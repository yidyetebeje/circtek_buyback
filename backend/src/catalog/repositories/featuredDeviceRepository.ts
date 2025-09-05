import { db } from "../../db";
import { featuredDevices, models, shops } from "../../db/schema/catalog";
import { NewFeaturedDevice, FeaturedDevice } from "../types/featuredDeviceTypes";
import { and, eq, desc, asc, sql, inArray, like } from "drizzle-orm";

export class FeaturedDeviceRepository {
  async createFeaturedDevice(data: NewFeaturedDevice): Promise<FeaturedDevice | undefined> {
    const [insertResult] = await db.insert(featuredDevices).values(data);
    const newFeaturedDeviceId = insertResult.insertId;
    if (newFeaturedDeviceId === 0) {
      console.error("Failed to retrieve a valid ID for the new featured device (insertId was 0). Ensure 'id' is an auto-incrementing primary key.");
      return undefined;
    }

    const newDeviceArray = await db
      .select()
      .from(featuredDevices)
      .where(eq(featuredDevices.id, newFeaturedDeviceId))
      .limit(1);

    return newDeviceArray[0] as FeaturedDevice | undefined;
  }

  async getFeaturedDevices(params: {
    shopIds?: number[];
    modelId?: number;
    modelTitle?: string;
    clientId?: number;
    isPublished?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'updatedAt';
    orderDirection?: 'asc' | 'desc';
  }): Promise<FeaturedDevice[]> {
    const { shopIds, modelId, modelTitle, clientId, isPublished, limit = 10, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = params;

    const conditions = [];
    if (shopIds && shopIds.length > 0) conditions.push(inArray(featuredDevices.shopId, shopIds));
    if (modelId !== undefined) conditions.push(eq(featuredDevices.modelId, modelId));
    if (clientId !== undefined) conditions.push(eq(featuredDevices.clientId, clientId));
    if (isPublished !== undefined) conditions.push(eq(featuredDevices.isPublished, isPublished));
    if (modelTitle) {
      conditions.push(like(models.title, `%${modelTitle}%`));
    }
    
    const { shopModels } = await import("../../db/schema/catalog");
    
    const query = db.select({
        id: featuredDevices.id,
        modelId: featuredDevices.modelId,
        shopId: featuredDevices.shopId,
        clientId: featuredDevices.clientId,
        isPublished: featuredDevices.isPublished,
        createdAt: featuredDevices.createdAt,
        updatedAt: featuredDevices.updatedAt,
        model: {
          id: models.id,
          title: models.title,
          brand_id: models.brand_id,
          model_image: models.model_image,
          base_price: sql`COALESCE(${shopModels.base_price}, ${models.base_price})`,
          sef_url: models.sef_url
        },
        shop: {
          id: shops.id,
          name: shops.name,
          logo: shops.logo,
          organization: shops.organization,
          phone: shops.phone,
        }
      })
      .from(featuredDevices)
      .leftJoin(models, eq(featuredDevices.modelId, models.id))
      .leftJoin(shops, eq(featuredDevices.shopId, shops.id))
      .leftJoin(shopModels, and(
        eq(shopModels.model_id, featuredDevices.modelId),
        eq(shopModels.shop_id, featuredDevices.shopId)
      ))
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    if (orderBy === 'createdAt') {
      query.orderBy(orderDirection === 'asc' ? asc(featuredDevices.createdAt) : desc(featuredDevices.createdAt));
    } else if (orderBy === 'updatedAt') {
      query.orderBy(orderDirection === 'asc' ? asc(featuredDevices.updatedAt) : desc(featuredDevices.updatedAt));
    }

    return (await query) as FeaturedDevice[];
  }

  async getFeaturedDeviceById(id: number): Promise<FeaturedDevice | undefined> {
    const result = await db.select({
        id: featuredDevices.id,
        modelId: featuredDevices.modelId,
        shopId: featuredDevices.shopId,
        clientId: featuredDevices.clientId,
        isPublished: featuredDevices.isPublished,
        createdAt: featuredDevices.createdAt,
        updatedAt: featuredDevices.updatedAt,
        model: {
          id: models.id,
          title: models.title,
          brand_id: models.brand_id,
          model_image: models.model_image,
          base_price: models.base_price,
          sef_url: models.sef_url
        },
        shop: {
          id: shops.id,
          name: shops.name,
          logo: shops.logo,
          organization: shops.organization,
          phone: shops.phone
        }
      })
      .from(featuredDevices)
      .leftJoin(models, eq(featuredDevices.modelId, models.id))
      .leftJoin(shops, eq(featuredDevices.shopId, shops.id))
      .where(eq(featuredDevices.id, id));

    return result[0] as FeaturedDevice | undefined;
  }

  async updateFeaturedDevice(id: number, data: Partial<Omit<NewFeaturedDevice, 'clientId' | 'shopId' | 'modelId'>>): Promise<FeaturedDevice | undefined> {
    await db.update(featuredDevices)
      .set(data)
      .where(eq(featuredDevices.id, id));
    return this.getFeaturedDeviceById(id);
  }

  async deleteFeaturedDevice(id: number): Promise<{ success: boolean }> {
    const executionResult = await db.delete(featuredDevices).where(eq(featuredDevices.id, id)).execute();
    return { success: executionResult[0].affectedRows > 0 };
  }

  async countFeaturedDevices(params: {
    shopIds?: number[];
    modelId?: number;
    modelTitle?: string;
    clientId?: number;
    isPublished?: boolean;
  }): Promise<number> {
    const { shopIds, modelId, modelTitle, clientId, isPublished } = params;
    const conditions = [];
    if (shopIds && shopIds.length > 0) conditions.push(inArray(featuredDevices.shopId, shopIds));
    if (modelId !== undefined) conditions.push(eq(featuredDevices.modelId, modelId));
    if (clientId !== undefined) conditions.push(eq(featuredDevices.clientId, clientId));
    if (isPublished !== undefined) conditions.push(eq(featuredDevices.isPublished, isPublished));
    if (modelTitle) conditions.push(like(models.title, `%${modelTitle}%`));

    const result = await db.select({ count: sql<number>`count(*)` })
        .from(featuredDevices)
        .leftJoin(models, eq(featuredDevices.modelId, models.id))
        .where(and(...conditions));

    return result[0]?.count ?? 0;
  }
}
