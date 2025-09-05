import { db } from "../../db";
import { featured_devices } from "../../db/buyback_catalogue.schema";
import { models } from "../../db/buyback_catalogue.schema";
import { shops } from "../../db/shops.schema";
import { NewFeaturedDevice, FeaturedDevice } from "../types/featuredDeviceTypes";
import { and, eq, desc, asc, sql, inArray, like } from "drizzle-orm";

export class FeaturedDeviceRepository {
  async createFeaturedDevice(data: NewFeaturedDevice): Promise<FeaturedDevice | undefined> {
    const [insertResult] = await db.insert(featured_devices).values(data);
    const newFeaturedDeviceId = insertResult.insertId;
    if (newFeaturedDeviceId === 0) {
      console.error("Failed to retrieve a valid ID for the new featured device (insertId was 0). Ensure 'id' is an auto-incrementing primary key.");
      return undefined;
    }

    const newDeviceArray = await db
      .select()
      .from(featured_devices)
      .where(eq(featured_devices.id, newFeaturedDeviceId))
      .limit(1);

    return newDeviceArray[0] as FeaturedDevice | undefined;
  }

  async getFeaturedDevices(params: {
    shopIds?: number[];
    modelId?: number;
    modelTitle?: string;
    tenantId?: number;
    isPublished?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'updatedAt';
    orderDirection?: 'asc' | 'desc';
  }): Promise<FeaturedDevice[]> {
    const { shopIds, modelId, modelTitle, tenantId, isPublished, limit = 10, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = params;

    const conditions = [];
    if (shopIds && shopIds.length > 0) conditions.push(inArray(featured_devices.shopId, shopIds));
    if (modelId !== undefined) conditions.push(eq(featured_devices.modelId, modelId));
    if (tenantId !== undefined) conditions.push(eq(featured_devices.tenantId, tenantId));
    if (isPublished !== undefined) conditions.push(eq(featured_devices.isPublished, isPublished));
    if (modelTitle) {
      conditions.push(like(models.title, `%${modelTitle}%`));
    }
    
    const query = db.select({
        id: featured_devices.id,
        modelId: featured_devices.modelId,
        shopId: featured_devices.shopId,
        tenantId: featured_devices.tenantId,
        isPublished: featured_devices.isPublished,
        createdAt: featured_devices.createdAt,
        updatedAt: featured_devices.updatedAt,
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
          phone: shops.phone,
        }
      })
      .from(featured_devices)
      .leftJoin(models, eq(featured_devices.modelId, models.id))
      .leftJoin(shops, eq(featured_devices.shopId, shops.id))
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    if (orderBy === 'createdAt') {
      query.orderBy(orderDirection === 'asc' ? asc(featured_devices.createdAt) : desc(featured_devices.createdAt));
    } else if (orderBy === 'updatedAt') {
      query.orderBy(orderDirection === 'asc' ? asc(featured_devices.updatedAt) : desc(featured_devices.updatedAt));
    }

    return (await query) as FeaturedDevice[];
  }

  async getFeaturedDeviceById(id: number): Promise<FeaturedDevice | undefined> {
    const result = await db.select({
        id: featured_devices.id,
        modelId: featured_devices.modelId,
        shopId: featured_devices.shopId,
        tenantId: featured_devices.tenantId,
        isPublished: featured_devices.isPublished,
        createdAt: featured_devices.createdAt,
        updatedAt: featured_devices.updatedAt,
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
      .from(featured_devices)
      .leftJoin(models, eq(featured_devices.modelId, models.id))
      .leftJoin(shops, eq(featured_devices.shopId, shops.id))
      .where(eq(featured_devices.id, id));

    return result[0] as FeaturedDevice | undefined;
  }

  async updateFeaturedDevice(id: number, data: Partial<Omit<NewFeaturedDevice, 'tenantId' | 'shopId' | 'modelId'>>): Promise<FeaturedDevice | undefined> {
    await db.update(featured_devices)
      .set(data)
      .where(eq(featured_devices.id, id));
    return this.getFeaturedDeviceById(id);
  }

  async deleteFeaturedDevice(id: number): Promise<{ success: boolean }> {
    const executionResult = await db.delete(featured_devices).where(eq(featured_devices.id, id)).execute();
    return { success: executionResult[0].affectedRows > 0 };
  }

  async countFeaturedDevices(params: {
    shopIds?: number[];
    modelId?: number;
    modelTitle?: string;
    tenantId?: number;
    isPublished?: boolean;
  }): Promise<number> {
    const { shopIds, modelId, modelTitle, tenantId, isPublished } = params;
    const conditions = [];
    if (shopIds && shopIds.length > 0) conditions.push(inArray(featured_devices.shopId, shopIds));
    if (modelId !== undefined) conditions.push(eq(featured_devices.modelId, modelId));
    if (tenantId !== undefined) conditions.push(eq(featured_devices.tenantId, tenantId));
    if (isPublished !== undefined) conditions.push(eq(featured_devices.isPublished, isPublished));
    if (modelTitle) conditions.push(like(models.title, `%${modelTitle}%`));

    const result = await db.select({ count: sql<number>`count(*)` })
        .from(featured_devices)
        .leftJoin(models, eq(featured_devices.modelId, models.id))
        .where(and(...conditions));

    return result[0]?.count ?? 0;
  }
}
