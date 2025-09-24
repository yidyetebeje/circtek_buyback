import { and, count, eq, like, or, SQL, asc, desc } from "drizzle-orm";
import { roles, tenants, users } from "../db/circtek.schema";
import { UserCreateInput, UserFilters, UserListResult, UserPublic, UserUpdateInput } from "./types";
import { db } from "../db/index";

const userPublicSelection = {
  id: users.id,
  name: users.name,
  user_name: users.user_name,
  created_at: users.created_at,
  status: users.status,
  role_id: users.role_id,
  tenant_id: users.tenant_id,
  warehouse_id: users.warehouse_id,
};

const userListSelection = {
  ...userPublicSelection,
  role_name: roles.name,
  tenant_name: tenants.name,
} as const;

// Sortable fields mapping
const sortableFields = {
  id: users.id,
  name: users.name,
  user_name: users.user_name,
  created_at: users.created_at,
  status: users.status,
  role_name: roles.name,
  tenant_name: tenants.name,
} as const;

export class UsersRepository {
  constructor(private readonly database: typeof db) {}

  async createUser(user: UserCreateInput): Promise<UserPublic | undefined> {
    const toInsert = {
      ...user,
      status: typeof user.status === 'boolean' ? user.status : true,
    } as any;
    await this.database.insert(users).values(toInsert);
    const [created] = await this.database
      .select(userPublicSelection)
      .from(users)
      .where(eq(users.user_name, user.user_name));
    return created;
  }

  async findOne(id: number): Promise<UserPublic | undefined> {
    const [result] = await this.database
      .select(userPublicSelection)
      .from(users)
      .where(eq(users.id, id));
    return result;
  }

  async findByUsername(user_name: string): Promise<UserPublic | undefined> {
    const [result] = await this.database
      .select(userPublicSelection)
      .from(users)
      .where(eq(users.user_name, user_name));
    return result;
  }


  async findAll(filters: UserFilters): Promise<UserListResult> {
    const conditions: any[] = [];
    if (typeof filters.tenant_id === 'number') conditions.push(eq(users.tenant_id, filters.tenant_id));
    if (typeof filters.role_id === 'number') conditions.push(eq(users.role_id, filters.role_id));
    if (typeof filters.is_active === 'boolean') conditions.push(eq(users.status, filters.is_active));
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(users.name, pattern),
          like(users.user_name, pattern)
        )
      );
    }

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 10));
    const offset = (page - 1) * limit;

    // Handle sorting
    const sortField = filters.sort && sortableFields[filters.sort as keyof typeof sortableFields] 
      ? sortableFields[filters.sort as keyof typeof sortableFields]
      : users.id; // default sort by id
    const sortOrder = filters.order === 'desc' ? desc : asc;

    let totalRow: { total: number } | undefined;
    if (conditions.length) {
      const finalCondition = and(...(conditions as any));
      [totalRow] = await this.database.select({ total: count() }).from(users).where(finalCondition as any);
    } else {
      [totalRow] = await this.database.select({ total: count() }).from(users);
    }

    let rows;
    if (conditions.length) {
      const finalCondition = and(...(conditions as any));
      rows = await this.database
        .select(userListSelection)
        .from(users)
        .leftJoin(roles, eq(users.role_id, roles.id))
        .leftJoin(tenants, eq(users.tenant_id, tenants.id))
        .where(finalCondition as any)
        .orderBy(sortOrder(sortField))
        .limit(limit)
        .offset(offset);
    } else {
      rows = await this.database
        .select(userListSelection)
        .from(users)
        .leftJoin(roles, eq(users.role_id, roles.id))
        .leftJoin(tenants, eq(users.tenant_id, tenants.id))
        .orderBy(sortOrder(sortField))
        .limit(limit)
        .offset(offset);
    }

    return { rows, total: totalRow?.total ?? 0, page, limit } as UserListResult;
  }

  async updateUser(id: number, user: UserUpdateInput): Promise<UserPublic | undefined> {
    const toUpdate = {
      ...user,
      status: typeof user.status === 'boolean' ? user.status : undefined,
    } as any;
    await this.database.update(users).set(toUpdate).where(eq(users.id, id));
    return this.findOne(id);
  }

  async deleteUser(id: number): Promise<{ id: number }> {
    await this.database.delete(users).where(eq(users.id, id));
    return { id };
  }
}