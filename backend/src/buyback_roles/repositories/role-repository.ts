import { db } from "../../db";
import { roles } from "../../db/circtek.schema"
import { InsertRoleDTO, UpdateRoleDTO, SelectRoleDTO } from "../types/role-types";
import { eq, and, isNull } from "drizzle-orm";

export class RoleRepository {
  async findAll(): Promise<SelectRoleDTO[]> {
    return db.select().from(roles);
  }

  async findById(id: number): Promise<SelectRoleDTO | undefined> {
    const result = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id));
    return result[0];
  }

  async findBySlug(slug: string): Promise<SelectRoleDTO | undefined> {
    const result = await db
      .select()
      .from(roles)
      .where(eq(roles.name, slug));
    return result[0];
  }

  async create(roleData: InsertRoleDTO): Promise<SelectRoleDTO | undefined> {
    const newRolePayload = {
      name: roleData.name,
      description: roleData.description,
      status: roleData.status ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.insert(roles).values(newRolePayload);
    // MySQL typically returns an object with insertId in result[0] for mysql2 driver
    // or directly as result.insertId depending on the exact driver/wrapper version.
    // We'll assume we need to fetch it if we want the full object back.
    if (result[0].insertId > 0) {
      return this.findById(result[0].insertId);
    }
    return undefined;
  }

  async update(id: number, roleData: UpdateRoleDTO): Promise<SelectRoleDTO | undefined> {
    const updatedRolePayload = {
      ...roleData,
      updated_at: new Date(),
    };
    const result = await db
      .update(roles)
      .set(updatedRolePayload)
      .where(eq(roles.id, id));
    
    if (result[0].affectedRows > 0) {
        return this.findById(id);
    }
    return undefined;
  }

  async delete(id: number): Promise<SelectRoleDTO | undefined> {
    const result = await db
      .update(roles)
      .set({ status: false, updated_at: new Date() })
      .where(eq(roles.id, id));
    
    if (result[0].affectedRows > 0) {
        // Fetch the updated record to confirm and return its state
        const updatedRecord = await db.select().from(roles).where(eq(roles.id, id));
        return updatedRecord[0];
    }
    return undefined;
  }

  // For hard delete, if ever needed
  // async hardDelete(id: number): Promise<void> {
  //   await db.delete(roles).where(eq(roles.id, id));
  // }
} 