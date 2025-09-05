import { asc, desc, eq, and, sql, or, inArray } from "drizzle-orm";
import { db } from "../../db";
import { shopLocations, shopLocationPhones } from "../../db/schema/user";
import { 
  TShopLocationCreate, 
  TShopLocationUpdate, 
  TShopLocationWithPhones,
  TShopLocationPhoneCreate,
  TShopLocationPhoneUpdate
} from "../types/shopTypes";

// Helper to remove undefined keys from an object
function removeUndefinedKeys<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

export class ShopLocationRepository {
  /**
   * Find all locations for a specific shop
   */
  async findByShopId(
    shopId: number,
    page = 1,
    limit = 20,
    orderBy = "displayOrder", 
    order: "asc" | "desc" = "asc",
    activeOnly = true
  ) {
    const offset = (page - 1) * limit;

    const conditions = [eq(shopLocations.shopId, shopId)];
    
    if (activeOnly) {
      conditions.push(eq(shopLocations.isActive, true));
    }
    
    const whereCondition = and(...conditions);

    const columnMapping: { [key: string]: any } = {
      id: shopLocations.id,
      name: shopLocations.name,
      displayOrder: shopLocations.displayOrder,
      city: shopLocations.city,
      country: shopLocations.country,
      isActive: shopLocations.isActive,
      createdAt: shopLocations.createdAt,
      updatedAt: shopLocations.updatedAt
    };

    if (!(orderBy in columnMapping)) {
      orderBy = "displayOrder";
    }

    const items = await db.query.shopLocations.findMany({
      where: whereCondition,
      limit,
      offset,
      orderBy: order === "asc"
        ? asc(columnMapping[orderBy])
        : desc(columnMapping[orderBy]),
      with: {
        phones: true
      }
    });

    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(shopLocations)
      .where(whereCondition);
    
    const total = totalCountResult[0]?.count ?? 0;

    return {
      data: items as TShopLocationWithPhones[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find location by ID with phone numbers
   */
  async findById(id: number): Promise<TShopLocationWithPhones | null> {
    const location = await db.query.shopLocations.findFirst({
      where: eq(shopLocations.id, id),
      with: {
        phones: true
      }
    });

    return location as TShopLocationWithPhones | null;
  }

  /**
   * Find locations within a radius (in kilometers) from a point
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    shopId?: number,
    limit = 10
  ): Promise<TShopLocationWithPhones[]> {
    // Using Haversine formula for distance calculation
    const conditions = [eq(shopLocations.isActive, true)];
    
    if (shopId) {
      conditions.push(eq(shopLocations.shopId, shopId));
    }

    const whereCondition = and(...conditions);

    // For simplicity, we'll get all active locations and filter in application
    // In production, you'd want to use a proper spatial query
    const locations = await db.query.shopLocations.findMany({
      where: whereCondition,
      with: {
        phones: true
      },
      limit: limit * 2 // Get more to account for filtering
    });

    // Calculate distances and filter
    const locationsWithDistance = locations.map(location => {
      const distance = this.calculateDistance(
        latitude, 
        longitude, 
        location.latitude, 
        location.longitude
      );
      return { ...location, distance };
    }).filter(location => location.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return locationsWithDistance as TShopLocationWithPhones[];
  }

  /**
   * Create a new shop location with phone numbers
   */
  async create(data: TShopLocationCreate): Promise<TShopLocationWithPhones | null> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Separate phones from location data
    const { phones, ...locationData } = data;
    
    const dbLocationData = {
      ...removeUndefinedKeys(locationData),
      createdAt: now,
      updatedAt: now
    };

    const result = await db.insert(shopLocations).values(dbLocationData as any);
    const insertId = result?.[0]?.insertId ?? 0;
    
    if (insertId === 0) return null;

    const locationId = Number(insertId);

    // Insert phone numbers if provided
    if (phones && phones.length > 0) {
      const phoneData = phones.map(phone => ({
        locationId,
        phoneNumber: phone.phoneNumber,
        phoneType: phone.phoneType,
        isPrimary: phone.isPrimary,
        createdAt: now,
        updatedAt: now
      }));

      await db.insert(shopLocationPhones).values(phoneData);
    }

    return this.findById(locationId);
  }

  /**
   * Update shop location
   */
  async update(id: number, data: TShopLocationUpdate): Promise<TShopLocationWithPhones | null> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Separate phones from location data
    const { phones, ...locationData } = data;
    
    const dbLocationData = {
      ...removeUndefinedKeys(locationData),
      updatedAt: now
    };

    // Update location
    await db.update(shopLocations)
      .set(dbLocationData as any)
      .where(eq(shopLocations.id, id));

    // Handle phone number updates if provided
    if (phones !== undefined) {
      // Delete existing phone numbers
      await db.delete(shopLocationPhones)
        .where(eq(shopLocationPhones.locationId, id));

      // Insert new phone numbers
      if (phones.length > 0) {
        const phoneData = phones.map(phone => ({
          locationId: id,
          phoneNumber: phone.phoneNumber,
          phoneType: phone.phoneType,
          isPrimary: phone.isPrimary,
          createdAt: now,
          updatedAt: now
        }));

        await db.insert(shopLocationPhones).values(phoneData);
      }
    }

    return this.findById(id);
  }

  /**
   * Delete shop location
   */
  async delete(id: number): Promise<boolean> {
    // Delete phone numbers first (due to foreign key constraint)
    await db.delete(shopLocationPhones)
      .where(eq(shopLocationPhones.locationId, id));

    // Delete location
    const result = await db.delete(shopLocations)
      .where(eq(shopLocations.id, id));
    
    return (result as any).affectedRows > 0;
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: number): Promise<TShopLocationWithPhones | null> {
    const location = await this.findById(id);
    if (!location) return null;

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await db.update(shopLocations)
      .set({ 
        isActive: !location.isActive,
        updatedAt: now 
      })
      .where(eq(shopLocations.id, id));

    return this.findById(id);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const shopLocationRepository = new ShopLocationRepository(); 