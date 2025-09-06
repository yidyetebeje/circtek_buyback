import { db } from '../../db';
import { users, roles } from '../../db/schema/user';
import { eq, ne, and, or, like, count, asc, desc as dizzleDesc, SQL, getTableColumns } from 'drizzle-orm';
import { CreateUserWithRoleDTO, UpdateUserRoleDTO, ListUsersQueryDTO } from '../types/user-types';
import * as bcrypt from 'bcrypt';

export class UserRepository {
  private SALT_ROUNDS = 10;

  async findById(id: number) {
    const result = await db
      .select({
        id: users.id,
        fName: users.fName,
        lName: users.lName,
        userName: users.userName,
        email: users.email,
        roleId: users.roleId,
        status: users.status,
        clientId: users.clientId,
        warehouseId: users.warehouseId,
        organizationName: users.organizationName,
        managed_shop_id: users.managed_shop_id,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
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
        title: roles.title,
        slug: roles.slug,
      })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    return result[0] || null;
  }

  async findByEmail(email: string) {
    const result = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] || null;
  }

  async findByUserName(userName: string) {
    const result = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.userName, userName))
      .limit(1);

    return result[0] || null;
  }

  async findRoleBySlug(slug: string) {
    const result = await db
      .select({
        id: roles.id,
        title: roles.title,
        slug: roles.slug,
      })
      .from(roles)
      .where(eq(roles.slug, slug))
      .limit(1);

    return result[0] || null;
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  }

  async createUserWithRole(userData: CreateUserWithRoleDTO, roleId: number, clientId: number) {
    const hashedPassword = await this.hashPassword(userData.password);
    
    await db.insert(users).values({
      fName: userData.fName,
      lName: userData.lName,
      userName: userData.userName,
      email: userData.email,
      password: hashedPassword,
      roleId: roleId,
      clientId: clientId,
      warehouseId: userData.warehouseId,
      organizationName: userData.organizationName,
      managed_shop_id: userData.managed_shop_id,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    const result = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (result.length === 0) return null;

    return {
      id: result[0].id,
      fName: userData.fName,
      lName: userData.lName,
      userName: userData.userName,
      email: userData.email,
    };
  }

  async updateUserRole(userId: number, roleId: number) {
    const currentUser = await this.findById(userId);
    if (!currentUser) return null;

    await db
      .update(users)
      .set({
        roleId: roleId,
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      })
      .where(eq(users.id, userId));

    return {
      id: currentUser.id,
      fName: currentUser.fName || '',
      lName: currentUser.lName || '',
      userName: currentUser.userName || '',
      email: currentUser.email || '',
    };
  }

  async updateUser(userId: number, updateData: Partial<{
    fName?: string;
    lName?: string;
    userName?: string;
    email?: string;
    password?: string;
    roleId?: number;
    status?: boolean;
    clientId?: number;
    warehouseId?: number;
    organizationName?: string;
    managed_shop_id?: number | null;
  }>) {
    // Check if user exists
    const existingUser = await this.findById(userId);
    if (!existingUser) {
      return null;
    }

    // Check for unique constraints if updating email or username
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, updateData.email), ne(users.id, userId)))
        .limit(1);
      
      if (emailExists.length > 0) {
        throw new Error('Email is already in use by another user.');
      }
    }

    if (updateData.userName && updateData.userName !== existingUser.userName) {
      const usernameExists = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.userName, updateData.userName), ne(users.id, userId)))
        .limit(1);
      
      if (usernameExists.length > 0) {
        throw new Error('Username is already in use by another user.');
      }
    }

    // Prepare update data
    const updateFields: any = {
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    // Add fields that are being updated
    if (updateData.fName !== undefined) updateFields.fName = updateData.fName;
    if (updateData.lName !== undefined) updateFields.lName = updateData.lName;
    if (updateData.userName !== undefined) updateFields.userName = updateData.userName;
    if (updateData.email !== undefined) updateFields.email = updateData.email;
    if (updateData.roleId !== undefined) updateFields.roleId = updateData.roleId;
    if (updateData.status !== undefined) updateFields.status = updateData.status;
    if (updateData.clientId !== undefined) updateFields.clientId = updateData.clientId;
    if (updateData.warehouseId !== undefined) updateFields.warehouseId = updateData.warehouseId;
    if (updateData.organizationName !== undefined) updateFields.organizationName = updateData.organizationName;
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

  async findManyPaginated(params: ListUsersQueryDTO, filterByAuthClientId?: number) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, roleId, roleSlug, status, clientId: queryClientId, shopId } = params;

    const conditions: SQL[] = [];
    const effectiveClientId = filterByAuthClientId !== undefined ? filterByAuthClientId : queryClientId;

    if (effectiveClientId !== undefined) {
        conditions.push(eq(users.clientId, effectiveClientId));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      const searchableStringColumns = [
        users.fName,
        users.lName,
        users.userName,
        users.email,
        users.organizationName,
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
      conditions.push(eq(users.roleId, roleId));
    }
    
    // Add roleSlug filtering support
    if (roleSlug !== undefined) {
      conditions.push(eq(roles.slug, roleSlug));
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
        id: users.id, fName: users.fName, lName: users.lName, userName: users.userName,
        email: users.email, status: users.status, createdAt: users.createdAt, updatedAt: users.updatedAt,
        organizationName: users.organizationName, roleId: users.roleId, roleTitle: roles.title,
        clientId: users.clientId, 
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id));

    const baseCountQuery = db
      .select({ total: count() })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id));

    // Apply conditions if they exist
    const queryBuilder = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;
      
    const countQueryBuilder = conditions.length > 0 
      ? baseCountQuery.where(and(...conditions))
      : baseCountQuery;

    const userTableColumns = getTableColumns(users);
    // Ensure sortBy is a valid key of userTableColumns, otherwise default to users.createdAt
    const sortKey = sortBy as keyof typeof userTableColumns;
    const sortColumnToUse = userTableColumns[sortKey] || users.createdAt;
        
    const result = await queryBuilder
        .orderBy(sortOrder === 'asc' ? asc(sortColumnToUse) : dizzleDesc(sortColumnToUse))
        .limit(limit)
        .offset((page - 1) * limit);
    
    const totalCountResult = await countQueryBuilder;
    const total = totalCountResult[0]?.total || 0;

    return {
      data: result.map(u => ({ ...u, role: u.roleId && u.roleTitle ? { id: u.roleId, title: u.roleTitle } : null })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
} 