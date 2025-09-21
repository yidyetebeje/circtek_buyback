import Elysia, { t } from "elysia";
import { ApiKeyController } from "./controller";
import { ApiKeyRepository } from "./repository";
import { 
  CreateApiKeyRequest, 
  UpdateApiKeyRequest, 
  RevokeApiKeyRequest, 
  ApiKeyListQuery, 
  ApiKeyUsageQuery 
} from "./types";
import { requireRole } from "../../auth";
import { db } from "../../db";

// Initialize dependencies
const repository = new ApiKeyRepository(db);
const controller = new ApiKeyController(repository);

export const api_key_routes = new Elysia({ prefix: '/api-keys' })
  .use(requireRole([])) // Allow all authenticated users to manage API keys
  
  // Create new API key
  .post('/', async (ctx) => {
    const { body, currentUserId, currentTenantId } = ctx as any;
    
    if (!currentUserId || !currentTenantId) {
      return {
        data: null,
        message: 'User authentication required',
        status: 401
      };
    }

    return controller.createApiKey(body, currentTenantId, currentUserId);
  }, {
    body: CreateApiKeyRequest,
    detail: {
      tags: ['API Key Management'],
      summary: 'Create API Key',
      description: 'Create a new API key for external API access. Requires JWT authentication.',
      security: [{ bearerAuth: [] }]
    }
  })

  // List API keys
  .get('/', async (ctx) => {
    const { query, currentTenantId } = ctx as any;
    
    if (!currentTenantId) {
      return {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
        message: 'User authentication required',
        status: 401
      };
    }

    // Scope to user's tenant
    const filters = {
      ...query,
      tenant_id: currentTenantId
    };

    return controller.listApiKeys(filters);
  }, {
    query: ApiKeyListQuery,
    detail: {
      tags: ['API Key Management'],
      summary: 'List API Keys',
      description: 'List API keys for the authenticated user\'s tenant with pagination and filtering. Requires JWT authentication.',
      security: [{ bearerAuth: [] }]
    }
  })

  // Get API key details
  .get('/:id', async (ctx) => {
    const { params, currentTenantId } = ctx as any;
    const id = parseInt(params.id);
    
    if (!currentTenantId) {
      return {
        data: null,
        message: 'User authentication required',
        status: 401
      };
    }

    return controller.getApiKey(id, currentTenantId);
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    detail: {
      tags: ['API Key Management'],
      summary: 'Get API Key',
      description: 'Get details of a specific API key by ID. Requires JWT authentication.',
      security: [{ bearerAuth: [] }]
    }
  })

  // Update API key
  .put('/:id', async (ctx) => {
    const { params, body, currentTenantId } = ctx as any;
    const id = parseInt(params.id);
    
    if (!currentTenantId) {
      return {
        data: null,
        message: 'User authentication required',
        status: 401
      };
    }

    return controller.updateApiKey(id, body, currentTenantId);
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    body: UpdateApiKeyRequest,
    detail: {
      tags: ['API Key Management'],
      summary: 'Update API Key',
      description: 'Update an existing API key\'s details or settings. Requires JWT authentication.',
      security: [{ bearerAuth: [] }]
    }
  })

  // Revoke API key
  .post('/:id/revoke', async (ctx) => {
    const { params, body, currentUserId, currentTenantId } = ctx as any;
    const id = parseInt(params.id);
    
    if (!currentUserId || !currentTenantId) {
      return {
        data: null,
        message: 'User authentication required',
        status: 401
      };
    }

    return controller.revokeApiKey(id, currentUserId, body?.reason, currentTenantId);
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    body: RevokeApiKeyRequest,
    detail: {
      tags: ['API Key Management'],
      summary: 'Revoke API Key',
      description: 'Revoke an API key, making it permanently inactive. Requires JWT authentication.',
      security: [{ bearerAuth: [] }]
    }
  })

  // Get API key usage statistics and logs
  .get('/:id/usage', async (ctx) => {
    const { params, query, currentTenantId } = ctx as any;
    const id = parseInt(params.id);
    
    if (!currentTenantId) {
      return {
        data: null,
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
        message: 'User authentication required',
        status: 401
      };
    }

    return controller.getApiKeyUsage(id, query, currentTenantId);
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    query: ApiKeyUsageQuery,
    detail: {
      tags: ['API Key Management'],
      summary: 'Get API Key Usage',
      description: 'Get usage statistics and logs for a specific API key. Requires JWT authentication.',
      security: [{ bearerAuth: [] }]
    }
  })

  // Delete API key (hard delete - admin only)
  .delete('/:id', async (ctx) => {
    const { params, currentTenantId, currentRole } = ctx as any;
    const id = parseInt(params.id);
    
    if (!currentTenantId) {
      return {
        data: null,
        message: 'User authentication required',
        status: 401
      };
    }

    // Optional: Check for admin role
    // if (currentRole !== 'admin') {
    //   return {
    //     data: null,
    //     message: 'Admin privileges required',
    //     status: 403
    //   };
    // }

    return controller.deleteApiKey(id, currentTenantId);
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    detail: {
      tags: ['API Key Management'],
      summary: 'Delete API Key',
      description: 'Permanently delete an API key and all its usage logs. Requires JWT authentication. Use with caution.',
      security: [{ bearerAuth: [] }]
    }
  })

  // Health check endpoint for API key management
  .get('/health', () => {
    return {
      data: {
        status: 'healthy',
        service: 'api-key-management',
        timestamp: new Date().toISOString()
      },
      message: 'API Key Management service is operational',
      status: 200
    };
  }, {
    detail: {
      tags: ['API Key Management'],
      summary: 'API Key Service Health Check',
      description: 'Check if the API key management service is operational'
    }
  });

export { controller as apiKeyController };