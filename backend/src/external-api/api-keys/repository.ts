import { MySql2Database } from "drizzle-orm/mysql2";
import { eq, and, gte, lte, desc, sql, like, or, isNull } from "drizzle-orm";
import { api_keys, api_key_usage_logs, users, tenants } from "../../db/circtek.schema";
import { 
  ApiKey, 
  ApiKeyWithDetails, 
  ApiKeyUsageLog, 
  ApiKeyUsageStats
} from "./types";
import { ApiKeyService } from "./service";

export class ApiKeyRepository {
  constructor(private db: MySql2Database<any>) {}

  /**
   * Create a new API key
   */
  async create(data: {
    name: string;
    description?: string;
    key_hash: string;
    key_prefix: string;
    tenant_id: number;
    created_by: number;
    rate_limit?: number;
    expires_at?: Date;
  }): Promise<ApiKey> {
    const [result] = await this.db.insert(api_keys).values({
      name: data.name,
      description: data.description || null,
      key_hash: data.key_hash,
      key_prefix: data.key_prefix,
      tenant_id: data.tenant_id,
      created_by: data.created_by,
      rate_limit: data.rate_limit || 1000,
      expires_at: data.expires_at || null,
    });

    const createdKey = await this.findById(Number(result.insertId));
    if (!createdKey) {
      throw new Error('Failed to create API key');
    }
    
    return createdKey;
  }

  /**
   * Find API key by ID
   */
  async findById(id: number): Promise<ApiKey | null> {
    const result = await this.db
      .select()
      .from(api_keys)
      .where(eq(api_keys.id, id))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return row as ApiKey;
  }

  /**
   * Find API key by hash for authentication
   */
  async findByHash(hash: string): Promise<ApiKey | null> {
    const result = await this.db
      .select()
      .from(api_keys)
      .where(and(
        eq(api_keys.key_hash, hash),
        eq(api_keys.is_active, true),
        or(isNull(api_keys.revoked_at))
      ))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return row as ApiKey;
  }

  /**
   * Find API key by prefix (for faster lookups)
   */
  async findByPrefix(prefix: string): Promise<ApiKey[]> {
    const result = await this.db
      .select()
      .from(api_keys)
      .where(and(
        eq(api_keys.key_prefix, prefix),
        eq(api_keys.is_active, true)
      ));

    return result as ApiKey[];
  }

  /**
   * List API keys with pagination and filtering
   */
  async list(filters: {
    tenant_id?: number;
    is_active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ApiKeyWithDetails[]; total: number; page: number; limit: number }> {
    const { tenant_id, is_active, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    
    if (tenant_id) {
      conditions.push(eq(api_keys.tenant_id, tenant_id));
    }
    
    if (is_active !== undefined) {
      conditions.push(eq(api_keys.is_active, is_active));
    }
    
    if (search) {
      conditions.push(
        or(
          like(api_keys.name, `%${search}%`),
          like(api_keys.description, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(api_keys)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;

    // Get API keys with details
    const result = await this.db
      .select()
      .from(api_keys)
      .innerJoin(tenants, eq(api_keys.tenant_id, tenants.id))
      .innerJoin(users, eq(api_keys.created_by, users.id))
      .where(whereClause)
      .orderBy(desc(api_keys.created_at))
      .limit(limit)
      .offset(offset);

    const apiKeysWithDetails: ApiKeyWithDetails[] = result.map(row => ({
      id: row.api_keys.id,
      name: row.api_keys.name,
      description: row.api_keys.description,
      key_hash: row.api_keys.key_hash,
      key_prefix: row.api_keys.key_prefix,
      tenant_id: row.api_keys.tenant_id,
      created_by: row.api_keys.created_by,
      rate_limit: row.api_keys.rate_limit,
      expires_at: row.api_keys.expires_at,
      last_used_at: row.api_keys.last_used_at,
      last_used_ip: row.api_keys.last_used_ip,
      usage_count: row.api_keys.usage_count,
      is_active: row.api_keys.is_active,
      revoked_at: row.api_keys.revoked_at,
      revoked_by: row.api_keys.revoked_by,
      revoked_reason: row.api_keys.revoked_reason,
      created_at: row.api_keys.created_at,
      updated_at: row.api_keys.updated_at,
      tenant_name: row.tenants.name,
      created_by_name: row.users.name,
      created_by_email: row.users.email,
    }));

    return {
      data: apiKeysWithDetails,
      total,
      page,
      limit
    };
  }

  /**
   * Update API key
   */
  async update(id: number, data: {
    name?: string;
    description?: string;
    rate_limit?: number;
    expires_at?: Date;
    is_active?: boolean;
  }): Promise<ApiKey | null> {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.rate_limit !== undefined) updateData.rate_limit = data.rate_limit;
    if (data.expires_at !== undefined) updateData.expires_at = data.expires_at;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    
    updateData.updated_at = sql`CURRENT_TIMESTAMP`;

    await this.db
      .update(api_keys)
      .set(updateData)
      .where(eq(api_keys.id, id));

    return this.findById(id);
  }

  /**
   * Revoke API key
   */
  async revoke(id: number, revokedBy: number, reason?: string): Promise<boolean> {
    const result = await this.db
      .update(api_keys)
      .set({
        is_active: false,
        revoked_at: sql`CURRENT_TIMESTAMP`,
        revoked_by: revokedBy,
        revoked_reason: reason || null,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(api_keys.id, id));

    return result.length > 0;
  }

  /**
   * Update last used information
   */
  async updateLastUsed(id: number, ipAddress?: string): Promise<void> {
    await this.db
      .update(api_keys)
      .set({
        last_used_at: sql`CURRENT_TIMESTAMP`,
        last_used_ip: ipAddress || null,
        usage_count: sql`${api_keys.usage_count} + 1`,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(api_keys.id, id));
  }

  /**
   * Log API key usage
   */
  async logUsage(data: {
    api_key_id: number;
    tenant_id: number;
    endpoint: string;
    method: string;
    ip_address?: string;
    user_agent?: string;
    request_size?: number;
    response_status?: number;
    response_time_ms?: number;
    error_message?: string;
  }): Promise<void> {
    await this.db.insert(api_key_usage_logs).values({
      api_key_id: data.api_key_id,
      tenant_id: data.tenant_id,
      endpoint: data.endpoint,
      method: data.method,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      request_size: data.request_size || null,
      response_status: data.response_status || null,
      response_time_ms: data.response_time_ms || null,
      error_message: data.error_message || null,
    });
  }

  /**
   * Get API key usage logs
   */
  async getUsageLogs(
    apiKeyId: number,
    filters: {
      start_date?: string;
      end_date?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: ApiKeyUsageLog[]; total: number; page: number; limit: number }> {
    const { start_date, end_date, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(api_key_usage_logs.api_key_id, apiKeyId)];
    
    if (start_date) {
      conditions.push(gte(api_key_usage_logs.created_at, new Date(start_date)));
    }
    
    if (end_date) {
      conditions.push(lte(api_key_usage_logs.created_at, new Date(end_date)));
    }

    const whereClause = and(...conditions);

    // Get total count
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(api_key_usage_logs)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;

    // Get usage logs
    const result = await this.db
      .select()
      .from(api_key_usage_logs)
      .where(whereClause)
      .orderBy(desc(api_key_usage_logs.created_at))
      .limit(limit)
      .offset(offset);

    return {
      data: result as ApiKeyUsageLog[],
      total,
      page,
      limit
    };
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(apiKeyId: number): Promise<ApiKeyUsageStats> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total requests
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(api_key_usage_logs)
      .where(eq(api_key_usage_logs.api_key_id, apiKeyId));

    // Successful requests (status 200-299)
    const successfulResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(api_key_usage_logs)
      .where(and(
        eq(api_key_usage_logs.api_key_id, apiKeyId),
        sql`${api_key_usage_logs.response_status} >= 200 AND ${api_key_usage_logs.response_status} < 300`
      ));

    // Failed requests
    const failedResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(api_key_usage_logs)
      .where(and(
        eq(api_key_usage_logs.api_key_id, apiKeyId),
        sql`${api_key_usage_logs.response_status} >= 400`
      ));

    // Average response time
    const avgResponseTimeResult = await this.db
      .select({ avg: sql<number>`AVG(${api_key_usage_logs.response_time_ms})` })
      .from(api_key_usage_logs)
      .where(and(
        eq(api_key_usage_logs.api_key_id, apiKeyId),
        sql`${api_key_usage_logs.response_time_ms} IS NOT NULL`
      ));

    // Last 7 days
    const last7DaysResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(api_key_usage_logs)
      .where(and(
        eq(api_key_usage_logs.api_key_id, apiKeyId),
        gte(api_key_usage_logs.created_at, last7Days)
      ));

    // Last 24 hours
    const last24HoursResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(api_key_usage_logs)
      .where(and(
        eq(api_key_usage_logs.api_key_id, apiKeyId),
        gte(api_key_usage_logs.created_at, last24Hours)
      ));

    // Rate limit hits (status 429)
    const rateLimitResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(api_key_usage_logs)
      .where(and(
        eq(api_key_usage_logs.api_key_id, apiKeyId),
        eq(api_key_usage_logs.response_status, 429)
      ));

    return {
      total_requests: totalResult[0]?.count || 0,
      successful_requests: successfulResult[0]?.count || 0,
      failed_requests: failedResult[0]?.count || 0,
      average_response_time: avgResponseTimeResult[0]?.avg || null,
      last_7_days: last7DaysResult[0]?.count || 0,
      last_24_hours: last24HoursResult[0]?.count || 0,
      rate_limit_hits: rateLimitResult[0]?.count || 0,
    };
  }

  /**
   * Get usage count for rate limiting (current hour)
   */
  async getHourlyUsageCount(apiKeyId: number): Promise<number> {
    const now = new Date();
    const currentHour = new Date(now);
    currentHour.setMinutes(0, 0, 0);

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(api_key_usage_logs)
      .where(and(
        eq(api_key_usage_logs.api_key_id, apiKeyId),
        gte(api_key_usage_logs.created_at, currentHour)
      ));

    return result[0]?.count || 0;
  }

  /**
   * Delete API key (hard delete - use with caution)
   */
  async delete(id: number): Promise<boolean> {
    // First delete usage logs
    await this.db
      .delete(api_key_usage_logs)
      .where(eq(api_key_usage_logs.api_key_id, id));

    // Then delete the API key
    const result = await this.db
      .delete(api_keys)
      .where(eq(api_keys.id, id));

    return result.length > 0;
  }
}