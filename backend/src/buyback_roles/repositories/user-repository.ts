import { db } from '../../db';
import { users, roles } from '../../db/circtek.schema';
import { eq, ne, and, or, like, count, asc, desc as dizzleDesc, SQL, getTableColumns } from 'drizzle-orm';
import { CreateUserWithRoleDTO, UpdateUserRoleDTO, ListUsersQueryDTO } from '../types/user-types';
import * as bcrypt from 'bcrypt';

export class UserRepository {
  private SALT_ROUNDS = 10;

  async findById(id: number) {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        user_name: users.user_name,
        role_id: users.role_id,
        status: users.status,
        tenant_id: users.tenant_id,
        warehouse_id: users.warehouse_id,
        managed_shop_id: users.managed_shop_id,
        created_at: users.created_at,
        updated_at: users.updated_at
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findRoleById(roleId: number) {
    const result = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    return result[0] || null;
  }

  async findByUserName(userName: string) {
    const result = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.user_name, userName))
      .limit(1);

    return result[0] || null;
  }

  async findByEmail(userName: string) {
    const result = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.user_name, userName))
      .limit(1);

    return result[0] || null;
  }

  async findRoleByName(name: string) {
    const result = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);

    return result[0] || null;
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  }

  async createUserWithRole(userData: CreateUserWithRoleDTO, roleId: number, tenantId: number) {
    const hashedPassword = await this.hashPassword(userData.password);

    // Convert warehouseId of 0 to null (for foreign key constraint)
    const warehouseId = userData.warehouseId && userData.warehouseId > 0 ? userData.warehouseId : null;

    await db.insert(users).values({
      name: userData.fName + ' ' + (userData.lName || ''),
      user_name: userData.userName,
      password: hashedPassword,
      role_id: roleId,
      tenant_id: tenantId,
      warehouse_id: warehouseId,
      managed_shop_id: userData.managed_shop_id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.user_name, userData.userName))
      .limit(1);

    if (result.length === 0) return null;

    return {
      id: result[0].id,
      name: userData.fName + ' ' + (userData.lName || ''),
      user_name: userData.userName,
    };
  }

  async updateUserRole(userId: number, roleId: number) {
    const currentUser = await this.findById(userId);
    if (!currentUser) return null;

    await db
      .update(users)
      .set({
        role_id: roleId,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      id: currentUser.id,
      name: currentUser.name || '',
      user_name: currentUser.user_name || '',
    };
  }

  async updateUser(userId: number, updateData: Partial<{
    name?: string;
    user_name?: string;
    password?: string;
    role_id?: number;
    status?: boolean;
    tenant_id?: number;
    warehouse_id?: number;
    managed_shop_id?: number | null;
  }>) {
    // Check if user exists
    const existingUser = await this.findById(userId);
    if (!existingUser) {
      return null;
    }

    // Check for unique constraints if updating email or username
    if (updateData.user_name && updateData.user_name !== existingUser.user_name) {
      const userNameExists = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.user_name, updateData.user_name), ne(users.id, userId)))
        .limit(1);

      if (userNameExists.length > 0) {
        throw new Error('User name is already in use by another user.');
      }
    }

    if (updateData.user_name && updateData.user_name !== existingUser.user_name) {
      const usernameExists = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.user_name, updateData.user_name), ne(users.id, userId)))
        .limit(1);

      if (usernameExists.length > 0) {
        throw new Error('Username is already in use by another user.');
      }
    }

    // Prepare update data
    const updateFields: any = {
      updated_at: new Date(),
    };

    // Add fields that are being updated
    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.user_name !== undefined) updateFields.user_name = updateData.user_name;
    if (updateData.role_id !== undefined) updateFields.role_id = updateData.role_id;
    if (updateData.status !== undefined) updateFields.status = updateData.status;
    if (updateData.tenant_id !== undefined) updateFields.tenant_id = updateData.tenant_id;
    if (updateData.warehouse_id !== undefined) updateFields.warehouse_id = updateData.warehouse_id;
    if (updateData.managed_shop_id !== undefined) updateFields.managed_shop_id = updateData.managed_shop_id;

    // Handle password update if provided
    if (updateData.password) {
      const hashedPassword = await this.hashPassword(updateData.password);
      updateFields.password = hashedPassword;
    }

    // Perform the update
    await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, userId));

    // Return updated user
    return await this.findById(userId);
  }

  async findManyPaginated(params: ListUsersQueryDTO, filterByAuthTenantId?: number) {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc', search, roleId, roleName, status, tenantId: queryTenantId, shopId } = params;

    const conditions: SQL[] = [];
    const effectiveTenantId = filterByAuthTenantId !== undefined ? filterByAuthTenantId : queryTenantId;

    if (effectiveTenantId !== undefined) {
      conditions.push(eq(users.tenant_id, effectiveTenantId));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      const searchableStringColumns = [
        users.name,
        users.user_name,
      ];

      const searchSqlConditions = searchableStringColumns
        .filter((col): col is typeof col => col !== undefined && col !== null)
        .map(col => like(col, searchPattern));

      if (searchSqlConditions.length > 0) {
        const searchCondition = or(...searchSqlConditions);
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }
    }

    if (roleId !== undefined) {
      conditions.push(eq(users.role_id, roleId));
    }

    // Add roleName filtering support
    if (roleName !== undefined) {
      conditions.push(eq(roles.name, roleName));
    }

    if (status !== undefined) {
      conditions.push(eq(users.status, status));
    }

    // Filter by managed_shop_id when shopId provided (e.g., list users assigned to a shop)
    if (shopId !== undefined) {
      conditions.push(eq(users.managed_shop_id, Number(shopId)));
    }

    // Build the base query
    const baseQuery = db
      .select({
        id: users.id, name: users.name, user_name: users.user_name,
        status: users.status, created_at: users.created_at, updated_at: users.updated_at,
        role_id: users.role_id, roleName: roles.name,
        tenant_id: users.tenant_id,
      })
      .from(users)
      .leftJoin(roles, eq(users.role_id, roles.id));

    const baseCountQuery = db
      .select({ total: count() })
      .from(users)
      .leftJoin(roles, eq(users.role_id, roles.id));

    // Apply conditions if they exist
    const queryBuilder = conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const countQueryBuilder = conditions.length > 0
      ? baseCountQuery.where(and(...conditions))
      : baseCountQuery;

    const userTableColumns = getTableColumns(users);
    // Ensure sortBy is a valid key of userTableColumns, otherwise default to users.created_at
    const sortKey = sortBy as keyof typeof userTableColumns;
    const sortColumnToUse = userTableColumns[sortKey] || users.created_at;

    const result = await queryBuilder
      .orderBy(sortOrder === 'asc' ? asc(sortColumnToUse) : dizzleDesc(sortColumnToUse))
      .limit(limit)
      .offset((page - 1) * limit);

    const totalCountResult = await countQueryBuilder;
    const total = totalCountResult[0]?.total || 0;

    return {
      data: result.map(u => ({ ...u, role: u.role_id && u.roleName ? { id: u.role_id, name: u.roleName } : null })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
} 