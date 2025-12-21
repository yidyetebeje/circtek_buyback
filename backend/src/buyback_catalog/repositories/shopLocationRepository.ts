import { asc, desc, eq, and, sql, or, inArray } from "drizzle-orm";
import { db } from "../../db";

import { shop_locations, shop_location_phones } from "../../db/shops.schema";
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

    const conditions = [eq(shop_locations.shop_id, shopId)];

    if (activeOnly) {
      conditions.push(eq(shop_locations.is_active, true));
    }

    const whereCondition = and(...conditions);

    const columnMapping: { [key: string]: any } = {
      id: shop_locations.id,
      name: shop_locations.name,
      displayOrder: shop_locations.display_order,
      city: shop_locations.city,
      country: shop_locations.country,
      isActive: shop_locations.is_active,
      createdAt: shop_locations.created_at,
      updatedAt: shop_locations.updated_at
    };

    if (!(orderBy in columnMapping)) {
      orderBy = "displayOrder";
    }

    const items = await db.select({
      id: shop_locations.id,
      shop_id: shop_locations.shop_id,
      name: shop_locations.name,
      address: shop_locations.address,
      city: shop_locations.city,
      state: shop_locations.state,
      postal_code: shop_locations.postal_code,
      country: shop_locations.country,
      latitude: shop_locations.latitude,
      longitude: shop_locations.longitude,
      description: shop_locations.description,
      operating_hours: shop_locations.operating_hours,
      is_active: shop_locations.is_active,
      display_order: shop_locations.display_order,
      created_at: shop_locations.created_at,
      updated_at: shop_locations.updated_at
    })
      .from(shop_locations)
      .where(whereCondition)
      .limit(limit)
      .offset(offset)
      .orderBy(order === "asc"
        ? asc(columnMapping[orderBy])
        : desc(columnMapping[orderBy]));

    // Get phones separately
    const locationIds = items.map(item => item.id);
    const phones = locationIds.length > 0 ? await db.select()
      .from(shop_location_phones)
      .where(inArray(shop_location_phones.location_id, locationIds)) : [];

    // Combine data
    const itemsWithPhones = items.map(item => ({
      ...item,
      phones: phones.filter(phone => phone.location_id === item.id)
    }));

    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(shop_locations)
      .where(whereCondition);

    const total = totalCountResult[0]?.count ?? 0;

    return {
      data: itemsWithPhones as TShopLocationWithPhones[],
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
    const location = await db.select({
      id: shop_locations.id,
      shop_id: shop_locations.shop_id,
      name: shop_locations.name,
      address: shop_locations.address,
      city: shop_locations.city,
      state: shop_locations.state,
      postal_code: shop_locations.postal_code,
      country: shop_locations.country,
      latitude: shop_locations.latitude,
      longitude: shop_locations.longitude,
      description: shop_locations.description,
      operating_hours: shop_locations.operating_hours,
      is_active: shop_locations.is_active,
      display_order: shop_locations.display_order,
      created_at: shop_locations.created_at,
      updated_at: shop_locations.updated_at
    })
      .from(shop_locations)
      .where(eq(shop_locations.id, id))
      .limit(1);

    if (location.length === 0) return null;

    const phones = await db.select()
      .from(shop_location_phones)
      .where(eq(shop_location_phones.location_id, id));

    return {
      ...location[0],
      phones
    } as TShopLocationWithPhones;
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
    const conditions = [eq(shop_locations.is_active, true)];

    if (shopId) {
      conditions.push(eq(shop_locations.shop_id, shopId));
    }

    const whereCondition = and(...conditions);

    // For simplicity, we'll get all active locations and filter in application
    // In production, you'd want to use a proper spatial query
    const locations = await db.select({
      id: shop_locations.id,
      shop_id: shop_locations.shop_id,
      name: shop_locations.name,
      address: shop_locations.address,
      city: shop_locations.city,
      state: shop_locations.state,
      postal_code: shop_locations.postal_code,
      country: shop_locations.country,
      latitude: shop_locations.latitude,
      longitude: shop_locations.longitude,
      description: shop_locations.description,
      operating_hours: shop_locations.operating_hours,
      is_active: shop_locations.is_active,
      display_order: shop_locations.display_order,
      created_at: shop_locations.created_at,
      updated_at: shop_locations.updated_at
    })
      .from(shop_locations)
      .where(whereCondition)
      .limit(limit * 2); // Get more to account for filtering

    // Get phones for all locations
    const locationIds = locations.map(loc => loc.id);
    const phones = locationIds.length > 0 ? await db.select()
      .from(shop_location_phones)
      .where(inArray(shop_location_phones.location_id, locationIds)) : [];

    // Combine locations with phones
    const locationsWithPhones = locations.map(location => ({
      ...location,
      phones: phones.filter(phone => phone.location_id === location.id)
    }));

    // Calculate distances and filter
    const locationsWithDistance = locationsWithPhones.map(location => {
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

    // Map camelCase input fields to snake_case database columns
    const dbLocationData = removeUndefinedKeys({
      shop_id: locationData.shopId,
      name: locationData.name,
      address: locationData.address,
      city: locationData.city,
      state: locationData.state,
      postal_code: locationData.postalCode,
      country: locationData.country,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      description: locationData.description,
      operating_hours: locationData.operatingHours,
      is_active: locationData.isActive,
      display_order: locationData.displayOrder,
      created_at: now,
      updated_at: now
    });

    const result = await db.insert(shop_locations).values(dbLocationData as any);
    const insertId = result?.[0]?.insertId ?? 0;

    if (insertId === 0) return null;

    const locationId = Number(insertId);

    // Insert phone numbers if provided
    if (phones && phones.length > 0) {
      const phoneData = phones.map(phone => ({
        location_id: locationId,
        phone_number: phone.phoneNumber,
        phone_type: phone.phoneType,
        is_primary: phone.isPrimary,
        created_at: now,
        updated_at: now
      }));

      await db.insert(shop_location_phones).values(phoneData);
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

    // Map camelCase input fields to snake_case database columns
    const dbLocationData = removeUndefinedKeys({
      shop_id: locationData.shopId,
      name: locationData.name,
      address: locationData.address,
      city: locationData.city,
      state: locationData.state,
      postal_code: locationData.postalCode,
      country: locationData.country,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      description: locationData.description,
      operating_hours: locationData.operatingHours,
      is_active: locationData.isActive,
      display_order: locationData.displayOrder,
      updated_at: now
    });

    // Update location
    await db.update(shop_locations)
      .set(dbLocationData as any)
      .where(eq(shop_locations.id, id));

    // Handle phone number updates if provided
    if (phones !== undefined) {
      // Delete existing phone numbers
      await db.delete(shop_location_phones)
        .where(eq(shop_location_phones.location_id, id));

      // Insert new phone numbers
      if (phones.length > 0) {
        const phoneData = phones.map(phone => ({
          location_id: id,
          phone_number: phone.phoneNumber,
          phone_type: phone.phoneType,
          is_primary: phone.isPrimary,
          created_at: now,
          updated_at: now
        }));

        await db.insert(shop_location_phones).values(phoneData);
      }
    }

    return this.findById(id);
  }

  /**
   * Delete shop location
   */
  async delete(id: number): Promise<boolean> {
    // Delete phone numbers first (due to foreign key constraint)
    await db.delete(shop_location_phones)
      .where(eq(shop_location_phones.location_id, id));

    // Delete location
    const result = await db.delete(shop_locations)
      .where(eq(shop_locations.id, id));

    return (result as any).affectedRows > 0;
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: number): Promise<TShopLocationWithPhones | null> {
    const location = await this.findById(id);
    if (!location) return null;

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.update(shop_locations)
      .set({
        is_active: !location.is_active,
        updated_at: now
      })
      .where(eq(shop_locations.id, id));

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
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const shopLocationRepository = new ShopLocationRepository(); 