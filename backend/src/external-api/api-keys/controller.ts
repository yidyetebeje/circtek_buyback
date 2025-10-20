import { ApiKeyRepository } from "./repository";
import { ApiKeyService } from "./service";
import { 
  CreateApiKeyResponse,
  ApiKeyListResponse,
  ApiKeyUsageResponse
} from "./types";

export class ApiKeyController {
  constructor(private repository: ApiKeyRepository) {}

  /**
   * Create a new API key
   */
  async createApiKey(
    data: {
      name: string;
      description?: string;
      rate_limit?: number;
      expires_at?: string;
    },
    tenantId: number,
    createdBy: number
  ): Promise<CreateApiKeyResponse> {
    try {
      // Validate the request
      const validation = ApiKeyService.validateCreateRequest(data);
      if (!validation.valid) {
        return {
          data: null as any,
          message: 'Validation failed',
          status: 400,
          errors: validation.errors
        } as any;
      }

      // Generate API key
      const { key, prefix, hash } = ApiKeyService.generateApiKey();

      // Parse expiration date if provided
      let expiresAt: Date | undefined;
      if (data.expires_at) {
        expiresAt = new Date(data.expires_at);
      }

      // Create the API key record
      const createdKey = await this.repository.create({
        name: data.name.trim(),
        description: data.description?.trim(),
        key_hash: hash,
        key_prefix: prefix,
        tenant_id: tenantId,
        created_by: createdBy,
        rate_limit: data.rate_limit || 10000000,
        expires_at: expiresAt,
      });

      return {
        data: {
          id: createdKey.id,
          name: createdKey.name,
          key: key, // Only returned once upon creation
          key_prefix: createdKey.key_prefix,
          expires_at: createdKey.expires_at,
          created_at: createdKey.created_at,
        },
        message: 'API key created successfully',
        status: 201,
      };

    } catch (error) {
      console.error('Create API key error:', error);
      return {
        data: null as any,
        message: 'Failed to create API key',
        status: 500,
        error: (error as Error).message
      } as any;
    }
  }

  /**
   * List API keys with pagination and filtering
   */
  async listApiKeys(filters: {
    tenant_id?: number;
    is_active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiKeyListResponse> {
    try {
      const result = await this.repository.list(filters);
      
      // Sanitize the response to remove sensitive data
      const sanitizedData = result.data.map(key => {
        const { key_hash, ...sanitized } = key;
        return {
          ...sanitized,
          key_display: `${key.key_prefix}_***`
        };
      });

      return {
        data: sanitizedData as any,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: Math.ceil(result.total / result.limit)
        },
        message: 'API keys retrieved successfully',
        status: 200,
      };

    } catch (error) {
      console.error('List API keys error:', error);
      return {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
        message: 'Failed to retrieve API keys',
        status: 500,
        error: (error as Error).message
      } as any;
    }
  }

  /**
   * Get API key details by ID
   */
  async getApiKey(id: number, tenantId?: number): Promise<any> {
    try {
      const apiKey = await this.repository.findById(id);
      
      if (!apiKey) {
        return {
          data: null,
          message: 'API key not found',
          status: 404
        };
      }

      // Check tenant access if tenant scoping is enforced
      if (tenantId && apiKey.tenant_id !== tenantId) {
        return {
          data: null,
          message: 'Access denied',
          status: 403
        };
      }

      // Remove sensitive data
      const { key_hash, ...sanitizedKey } = apiKey;
      
      return {
        data: {
          ...sanitizedKey,
          key_display: `${apiKey.key_prefix}_***`
        },
        message: 'API key retrieved successfully',
        status: 200
      };

    } catch (error) {
      console.error('Get API key error:', error);
      return {
        data: null,
        message: 'Failed to retrieve API key',
        status: 500,
        error: (error as Error).message
      };
    }
  }

  /**
   * Update API key
   */
  async updateApiKey(
    id: number,
    data: {
      name?: string;
      description?: string;
      rate_limit?: number;
      expires_at?: string;
      is_active?: boolean;
    },
    tenantId?: number
  ): Promise<any> {
    try {
      // Find existing API key
      const existingKey = await this.repository.findById(id);
      if (!existingKey) {
        return {
          data: null,
          message: 'API key not found',
          status: 404
        };
      }

      // Check tenant access
      if (tenantId && existingKey.tenant_id !== tenantId) {
        return {
          data: null,
          message: 'Access denied',
          status: 403
        };
      }

      // Parse expiration date if provided
      let expiresAt: Date | undefined;
      if (data.expires_at) {
        expiresAt = new Date(data.expires_at);
        if (isNaN(expiresAt.getTime())) {
          return {
            data: null,
            message: 'Invalid expiration date format',
            status: 400
          };
        }
        if (expiresAt <= new Date()) {
          return {
            data: null,
            message: 'Expiration date must be in the future',
            status: 400
          };
        }
      }

      // Update the API key
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.description !== undefined) updateData.description = data.description?.trim();
      if (data.rate_limit !== undefined) updateData.rate_limit = data.rate_limit;
      if (data.expires_at !== undefined) updateData.expires_at = expiresAt;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const updatedKey = await this.repository.update(id, updateData);
      
      if (!updatedKey) {
        return {
          data: null,
          message: 'Failed to update API key',
          status: 500
        };
      }

      // Remove sensitive data
      const { key_hash, ...sanitizedKey } = updatedKey;

      return {
        data: {
          ...sanitizedKey,
          key_display: `${updatedKey.key_prefix}_***`
        },
        message: 'API key updated successfully',
        status: 200
      };

    } catch (error) {
      console.error('Update API key error:', error);
      return {
        data: null,
        message: 'Failed to update API key',
        status: 500,
        error: (error as Error).message
      };
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(
    id: number,
    revokedBy: number,
    reason?: string,
    tenantId?: number
  ): Promise<any> {
    try {
      // Find existing API key
      const existingKey = await this.repository.findById(id);
      if (!existingKey) {
        return {
          data: null,
          message: 'API key not found',
          status: 404
        };
      }

      // Check tenant access
      if (tenantId && existingKey.tenant_id !== tenantId) {
        return {
          data: null,
          message: 'Access denied',
          status: 403
        };
      }

      // Check if already revoked
      if (existingKey.revoked_at) {
        return {
          data: null,
          message: 'API key is already revoked',
          status: 400
        };
      }

      // Revoke the API key
      const success = await this.repository.revoke(id, revokedBy, reason);
      
      if (!success) {
        return {
          data: null,
          message: 'Failed to revoke API key',
          status: 500
        };
      }

      return {
        data: {
          id: id,
          revoked: true,
          revoked_at: new Date(),
          revoked_by: revokedBy,
          reason: reason || null
        },
        message: 'API key revoked successfully',
        status: 200
      };

    } catch (error) {
      console.error('Revoke API key error:', error);
      return {
        data: null,
        message: 'Failed to revoke API key',
        status: 500,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get API key usage statistics and logs
   */
  async getApiKeyUsage(
    id: number,
    filters: {
      start_date?: string;
      end_date?: string;
      page?: number;
      limit?: number;
    },
    tenantId?: number
  ): Promise<ApiKeyUsageResponse> {
    try {
      // Find existing API key
      const existingKey = await this.repository.findById(id);
      if (!existingKey) {
        return {
          data: null as any,
          pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
          message: 'API key not found',
          status: 404,
        } as any;
      }

      // Check tenant access
      if (tenantId && existingKey.tenant_id !== tenantId) {
        return {
          data: null as any,
          pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
          message: 'Access denied',
          status: 403,
        } as any;
      }

      // Get usage logs
      const usageLogs = await this.repository.getUsageLogs(id, filters);
      
      // Get usage statistics
      const stats = await this.repository.getUsageStats(id);

      return {
        data: {
          usage_logs: usageLogs.data,
          stats: stats
        },
        pagination: {
          page: usageLogs.page,
          limit: usageLogs.limit,
          total: usageLogs.total,
          total_pages: Math.ceil(usageLogs.total / usageLogs.limit)
        },
        message: 'API key usage retrieved successfully',
        status: 200,
      };

    } catch (error) {
      console.error('Get API key usage error:', error);
      return {
        data: null as any,
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
        message: 'Failed to retrieve API key usage',
        status: 500,
        error: (error as Error).message
      } as any;
    }
  }

  /**
   * Delete API key (hard delete - use with caution)
   */
  async deleteApiKey(
    id: number,
    tenantId?: number
  ): Promise<any> {
    try {
      // Find existing API key
      const existingKey = await this.repository.findById(id);
      if (!existingKey) {
        return {
          data: null,
          message: 'API key not found',
          status: 404
        };
      }

      // Check tenant access
      if (tenantId && existingKey.tenant_id !== tenantId) {
        return {
          data: null,
          message: 'Access denied',
          status: 403
        };
      }

      // Delete the API key
      const success = await this.repository.delete(id);
      
      if (!success) {
        return {
          data: null,
          message: 'Failed to delete API key',
          status: 500
        };
      }

      return {
        data: {
          id: id,
          deleted: true
        },
        message: 'API key deleted successfully',
        status: 200
      };

    } catch (error) {
      console.error('Delete API key error:', error);
      return {
        data: null,
        message: 'Failed to delete API key',
        status: 500,
        error: (error as Error).message
      };
    }
  }
}