import { db } from "../../db";
import { roles } from "../../db/schema/user";
import { InsertRoleDTO, UpdateRoleDTO, SelectRoleDTO } from "../types/role-types";
import { eq, and, isNull } from "drizzle-orm";

export class RoleRepository {
  async findAll(): Promise<SelectRoleDTO[]> {
    return db.select().from(roles).where(isNull(roles.deletedAt));
  }

  async findById(id: number): Promise<SelectRoleDTO | undefined> {
    const result = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, id), isNull(roles.deletedAt)));
    return result[0];
  }

  async findBySlug(slug: string): Promise<SelectRoleDTO | undefined> {
    const result = await db
      .select()
      .from(roles)
      .where(and(eq(roles.slug, slug), isNull(roles.deletedAt)));
    return result[0];
  }

  async create(roleData: InsertRoleDTO): Promise<SelectRoleDTO | undefined> {
    const newRolePayload = {
      ...roleData,
      createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
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
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    };
    const result = await db
      .update(roles)
      .set(updatedRolePayload)
      .where(and(eq(roles.id, id), isNull(roles.deletedAt)));
    
    if (result[0].affectedRows > 0) {
        return this.findById(id);
    }
    return undefined;
  }

  async delete(id: number): Promise<SelectRoleDTO | undefined> {
    const result = await db
      .update(roles)
      .set({ deletedAt: new Date().toISOString().slice(0, 19).replace("T", " ") })
      .where(eq(roles.id, id)); // Note: Soft delete might allow deleting an already soft-deleted item, 
                                // or you might want to add isNull(roles.deletedAt) here too if that's not desired.
    
    if (result[0].affectedRows > 0) {
        // Fetch the soft-deleted record to confirm and return its state (including deletedAt)
        const deletedRecord = await db.select().from(roles).where(eq(roles.id, id));
        return deletedRecord[0];
    }
    return undefined;
  }

  // For hard delete, if ever needed
  // async hardDelete(id: number): Promise<void> {
  //   await db.delete(roles).where(eq(roles.id, id));
  // }
} 