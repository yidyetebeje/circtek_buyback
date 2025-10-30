import Elysia from 'elysia';
import { ApiKeyRepository } from './repository';
import { ApiKeyService } from './service';
import { ApiKeyContext } from './types';
import { db } from '../../db';

export class ApiKeyMiddleware {
  public static repository = new ApiKeyRepository(db);

  /**
   * Authentication middleware that validates API keys
   */
  static authenticate() {
    return new Elysia()
      .derive(async (ctx) => {
        /* debug removed */
       
        const headers = (ctx as any)?.headers ?? {};
        const request = (ctx as any)?.request as Request;
        const startTime = Date.now();
        
        try {
          // Extract API key from Authorization header
          const authorization = request.headers.get('authorization')
            || (typeof (headers as any).get === 'function' ? (headers as any).get('authorization') : undefined)
            || (headers as any)?.authorization
            || (headers as any)?.Authorization;
          if (!authorization) {
            return {
              isAuthenticated: false,
              error: 'Missing Authorization header',
              statusCode: 401
            };
          }

          // Check if it's Bearer token format
          const parts = authorization.split(' ');
          if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return {
              isAuthenticated: false,
              error: 'Invalid Authorization header format. Expected: Bearer <api_key>',
              statusCode: 401
            };
          }

          const apiKey = parts[1];

          // Validate key format
          if (!ApiKeyService.validateKeyFormat(apiKey)) {
            return {
              isAuthenticated: false,
              error: 'Invalid API key format',
              statusCode: 401
            };
          }

          // Hash the key for database lookup
          const keyHash = ApiKeyService.hashApiKey(apiKey);

          // Find the API key in database
          /* debug removed */
          const apiKeyRecord = await ApiKeyMiddleware.repository.findByHash(keyHash);
          if (!apiKeyRecord) {
            return {
              isAuthenticated: false,
              error: 'Invalid API key',
              statusCode: 401
            };
          }

          // Check if API key is active
          if (!ApiKeyService.isActive(apiKeyRecord)) {
            const reason = apiKeyRecord.revoked_at 
              ? 'API key has been revoked' 
              : apiKeyRecord.expires_at && ApiKeyService.isExpired(apiKeyRecord)
              ? 'API key has expired'
              : 'API key is inactive';
            
            return {
              isAuthenticated: false,
              error: reason,
              statusCode: 401
            };
          }

          // Rate limiting check
          /* debug removed */
          const currentUsage = await ApiKeyMiddleware.repository.getHourlyUsageCount(apiKeyRecord.id);
          const rateLimitCheck = ApiKeyService.calculateRateLimit(
            currentUsage,
            apiKeyRecord.rate_limit,
            new Date()
          );

          if (!rateLimitCheck.allowed) {
            // Log rate limit hit
            /* debug removed */
            const clientIp = ApiKeyMiddleware.getClientIP(request);
            const userAgent = request.headers.get('user-agent') || null;
            
            /* debug removed */
            await ApiKeyMiddleware.repository.logUsage({
              api_key_id: apiKeyRecord.id,
              tenant_id: apiKeyRecord.tenant_id,
              endpoint: new URL(request.url).pathname,
              method: request.method,
              ip_address: clientIp || undefined,
              user_agent: userAgent || undefined,
              response_status: 429,
              error_message: 'Rate limit exceeded'
            });

            return {
              isAuthenticated: false,
              error: 'Rate limit exceeded',
              statusCode: 429,
              rateLimitInfo: {
                limit: apiKeyRecord.rate_limit,
                remaining: 0,
                resetTime: rateLimitCheck.resetTime.toISOString()
              }
            };
          }

          // Update last used information (async, don't wait)
          /* debug removed */
          const clientIp = ApiKeyMiddleware.getClientIP(request);
          ApiKeyMiddleware.repository.updateLastUsed(apiKeyRecord.id, clientIp || undefined).catch(console.error);

          // Return authentication context
          const context: ApiKeyContext = {
            api_key: apiKeyRecord,
            tenant_id: apiKeyRecord.tenant_id
          };

          return {
            isAuthenticated: true,
            apiKeyContext: context,
            rateLimitInfo: {
              limit: apiKeyRecord.rate_limit,
              remaining: rateLimitCheck.remaining,
              resetTime: rateLimitCheck.resetTime.toISOString()
            }
          };

        } catch (error) {
          console.error('API Key authentication error:', error);
          return {
            isAuthenticated: false,
            error: 'Authentication failed',
            statusCode: 500
          };
        }
      })
      .onAfterResponse(async (ctx) => {
        try {
          /* debug removed */
          const apiKeyContext = (ctx as any)?.apiKeyContext as ApiKeyContext | undefined;
          const request = (ctx as any)?.request as Request;
          const response = (ctx as any)?.response as any;
          // Log successful usage (async, don't wait)
          if (apiKeyContext && 'api_key' in apiKeyContext && 'tenant_id' in apiKeyContext) {
            const responseTime = Date.now();
            /* debug removed */
            const clientIp = ApiKeyMiddleware.getClientIP(request);
            const userAgent = request.headers.get('user-agent');
            const context = apiKeyContext as ApiKeyContext;
            
            /* debug removed */
            ApiKeyMiddleware.repository.logUsage({
              api_key_id: context.api_key.id,
              tenant_id: context.tenant_id,
              endpoint: new URL(request.url).pathname,
              method: request.method,
              ip_address: clientIp || undefined,
              user_agent: userAgent || undefined,
              response_status: typeof response === 'object' && response && 'status' in response ? (response.status as number) : undefined,
              response_time_ms: responseTime - (request as any)?.startTime
            }).catch(console.error);
          }
        } catch (e) {
          console.error('DEBUG: authenticate() onAfterResponse failed', e);
        }
      });
  }

  // Permission system removed - all API keys have full access to all endpoints

  /**
   * Middleware for tenant scoping - ensures API key can only access its tenant's data
   */
  static tenantScope() {
    return new Elysia()
      .derive(({ query }) => {
        // This will be used with authenticateAndScope which provides the context
        return {
          tenantId: null,
          scopedQuery: query
        };
      });
  }

  /**
   * Combined authentication and tenant scoping middleware
   */
  static authenticateAndScope() {
    return new Elysia()
      .derive(async (ctx) => {
       
        const headers = (ctx as any)?.headers ?? {};
        const request = (ctx as any)?.request as Request;
        const query = (ctx as any)?.query || {};
        const startTime = Date.now();
        
        try {
          // Extract API key from Authorization header
          const authorization = headers.authorization;
          if (!authorization) {
            return {
              isAuthenticated: false,
              error: 'Missing Authorization header',
              statusCode: 401,
              tenantId: null,
              scopedQuery: query
            };
          }

          // Check if it's Bearer token format
          const parts = authorization.split(' ');
          if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return {
              isAuthenticated: false,
              error: 'Invalid Authorization header format. Expected: Bearer <api_key>',
              statusCode: 401,
              tenantId: null,
              scopedQuery: query
            };
          }

          const apiKey = parts[1];

          // Validate key format
          if (!ApiKeyService.validateKeyFormat(apiKey)) {
            return {
              isAuthenticated: false,
              error: 'Invalid API key format',
              statusCode: 401,
              tenantId: null,
              scopedQuery: query
            };
          }

          // Hash the key for database lookup
          const keyHash = ApiKeyService.hashApiKey(apiKey);

          // Find the API key in database
          const apiKeyRecord = await ApiKeyMiddleware.repository.findByHash(keyHash);
          if (!apiKeyRecord) {
            return {
              isAuthenticated: false,
              error: 'Invalid API key',
              statusCode: 401,
              tenantId: null,
              scopedQuery: query
            };
          }

          // Check if API key is active
          if (!ApiKeyService.isActive(apiKeyRecord)) {
            const reason = apiKeyRecord.revoked_at 
              ? 'API key has been revoked' 
              : apiKeyRecord.expires_at && ApiKeyService.isExpired(apiKeyRecord)
              ? 'API key has expired'
              : 'API key is inactive';
            
            return {
              isAuthenticated: false,
              error: reason,
              statusCode: 401,
              tenantId: null,
              scopedQuery: query
            };
          }

          // Rate limiting check
          const currentUsage = await ApiKeyMiddleware.repository.getHourlyUsageCount(apiKeyRecord.id);
          const rateLimitCheck = ApiKeyService.calculateRateLimit(
            currentUsage,
            apiKeyRecord.rate_limit,
            new Date()
          );

          if (!rateLimitCheck.allowed) {
            // Log rate limit hit
            const clientIp = ApiKeyMiddleware.getClientIP(request);
            const userAgent = headers['user-agent'] || null;
            
            await ApiKeyMiddleware.repository.logUsage({
              api_key_id: apiKeyRecord.id,
              tenant_id: apiKeyRecord.tenant_id,
              endpoint: new URL(request.url).pathname,
              method: request.method,
              ip_address: clientIp || undefined,
              user_agent: userAgent || undefined,
              response_status: 429,
              error_message: 'Rate limit exceeded'
            });

            return {
              isAuthenticated: false,
              error: 'Rate limit exceeded',
              statusCode: 429,
              rateLimitInfo: {
                limit: apiKeyRecord.rate_limit,
                remaining: 0,
                resetTime: rateLimitCheck.resetTime.toISOString()
              },
              tenantId: null,
              scopedQuery: query
            };
          }

          // Update last used information (async, don't wait)
          const clientIp = ApiKeyMiddleware.getClientIP(request);
          ApiKeyMiddleware.repository.updateLastUsed(apiKeyRecord.id, clientIp || undefined).catch(console.error);

          // Return authentication context with tenant scoping
          const context: ApiKeyContext = {
            api_key: apiKeyRecord,
            tenant_id: apiKeyRecord.tenant_id
          };

          // If tenant_id is provided in query, ensure it matches the API key's tenant
          const queryTenantId = (query as any)?.tenant_id;
          if (queryTenantId && Number(queryTenantId) !== apiKeyRecord.tenant_id) {
            throw new Error(`Access denied: API key is not authorized for tenant ${queryTenantId}`);
          }

          return {
            isAuthenticated: true,
            apiKeyContext: context,
            rateLimitInfo: {
              limit: apiKeyRecord.rate_limit,
              remaining: rateLimitCheck.remaining,
              resetTime: rateLimitCheck.resetTime.toISOString()
            },
            tenantId: apiKeyRecord.tenant_id,
            scopedQuery: {
              ...(query || {}),
              tenant_id: apiKeyRecord.tenant_id
            }
          };

        } catch (error) {
          console.error('API Key authentication error:', error);
          return {
            isAuthenticated: false,
            error: 'Authentication failed',
            statusCode: 500,
            tenantId: null,
            scopedQuery: query
          };
        }
      })
      .onAfterResponse(async (ctx) => {
        try {
          const apiKeyContext = (ctx as any)?.apiKeyContext as ApiKeyContext | undefined;
          const request = (ctx as any)?.request as Request;
          const response = (ctx as any)?.response as any;
          // Log successful usage (async, don't wait)
          if (apiKeyContext && 'api_key' in apiKeyContext && 'tenant_id' in apiKeyContext) {
            const responseTime = Date.now();
            const clientIp = ApiKeyMiddleware.getClientIP(request);
            const userAgent = request.headers.get('user-agent');
            const context = apiKeyContext as ApiKeyContext;
            
            ApiKeyMiddleware.repository.logUsage({
              api_key_id: context.api_key.id,
              tenant_id: context.tenant_id,
              endpoint: new URL(request.url).pathname,
              method: request.method,
              ip_address: clientIp || undefined,
              user_agent: userAgent || undefined,
              response_status: typeof response === 'object' && response && 'status' in response ? (response.status as number) : undefined,
              response_time_ms: responseTime - (request as any)?.startTime
            }).catch(console.error);
          }
        } catch (e) {
          console.error('DEBUG: authenticateAndScope() onAfterResponse failed', e);
        }
      });
  }

  /**
   * Error handling middleware
   */
  static errorHandler() {
    return new Elysia()
      .onError((ctx) => {
        try {
          const code = (ctx as any)?.code as string | undefined;
          const error = (ctx as any)?.error as unknown;
          if (code === 'VALIDATION') {
            return {
              data: null,
              message: 'Validation error',
              status: 400,
              errors: error instanceof Error ? error.message : String(error)
            };
          }

          // Handle authentication/authorization errors
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Access denied') || errorMessage.includes('Authentication')) {
            return {
              data: null,
              message: errorMessage,
              status: 403
            };
          }

          return {
            data: null,
            message: 'Internal server error',
            status: 500,
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
          };
        } catch (e) {
          console.error('DEBUG: ApiKeyMiddleware.errorHandler onError failed', e);
          return {
            data: null,
            message: 'Internal server error',
            status: 500
          };
        }
      });
  }

  /**
   * Extract client IP address from request
   */
  public static getClientIP(request: Request): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp;
    }
    
    // Note: In Elysia/Bun, we might need to handle this differently
    // This is a placeholder for client IP extraction
    return null;
  }

}

// Combined middleware for API key authentication and tenant scoping
export const authenticateAndScope = () => (app: Elysia) =>
  app
    .derive(async (ctx) => {
      // Minimal debug to verify invocation
     

      const headers = (ctx as any)?.headers ?? {};
      const request = (ctx as any)?.request as Request;
      const query = (ctx as any)?.query || {};

      try {
        // Extract API key
        const authorization = headers.authorization;
        if (!authorization) {
          return {
            isAuthenticated: false,
            error: 'Missing Authorization header',
            statusCode: 401,
            tenantId: null,
            scopedQuery: query
          };
        }

        // Validate Bearer format
        const parts = authorization.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
          return {
            isAuthenticated: false,
            error: 'Invalid Authorization header format. Expected: Bearer <api_key>',
            statusCode: 401,
            tenantId: null,
            scopedQuery: query
          };
        }

        const apiKey = parts[1];

        // Validate key format
        if (!ApiKeyService.validateKeyFormat(apiKey)) {
          return {
            isAuthenticated: false,
            error: 'Invalid API key format',
            statusCode: 401,
            tenantId: null,
            scopedQuery: query
          };
        }

        // Lookup
        const keyHash = ApiKeyService.hashApiKey(apiKey);
        const apiKeyRecord = await ApiKeyMiddleware.repository.findByHash(keyHash);
        if (!apiKeyRecord) {
          return {
            isAuthenticated: false,
            error: 'Invalid API key',
            statusCode: 401,
            tenantId: null,
            scopedQuery: query
          };
        }

        // Active check
        if (!ApiKeyService.isActive(apiKeyRecord)) {
          const reason = apiKeyRecord.revoked_at
            ? 'API key has been revoked'
            : apiKeyRecord.expires_at && ApiKeyService.isExpired(apiKeyRecord)
            ? 'API key has expired'
            : 'API key is inactive';

          return {
            isAuthenticated: false,
            error: reason,
            statusCode: 401,
            tenantId: null,
            scopedQuery: query
          };
        }

        // Rate limiting
        const currentUsage = await ApiKeyMiddleware.repository.getHourlyUsageCount(apiKeyRecord.id);
        const rateLimitCheck = ApiKeyService.calculateRateLimit(
          currentUsage,
          1000,
          new Date()
        );
        if (!rateLimitCheck.allowed) {
          const clientIp = ApiKeyMiddleware.getClientIP(request);
          const userAgent = headers['user-agent'] || null;

          await ApiKeyMiddleware.repository.logUsage({
            api_key_id: apiKeyRecord.id,
            tenant_id: apiKeyRecord.tenant_id,
            endpoint: new URL(request.url).pathname,
            method: request.method,
            ip_address: clientIp || undefined,
            user_agent: userAgent || undefined,
            response_status: 429,
            error_message: 'Rate limit exceeded'
          });

          return {
            isAuthenticated: false,
            error: 'Rate limit exceeded',
            statusCode: 429,
            rateLimitInfo: {
              limit: apiKeyRecord.rate_limit,
              remaining: 0,
              resetTime: rateLimitCheck.resetTime.toISOString()
            },
            tenantId: null,
            scopedQuery: query
          };
        }

        // Update last used (async)
        const clientIp = ApiKeyMiddleware.getClientIP(request);
        ApiKeyMiddleware.repository
          .updateLastUsed(apiKeyRecord.id, clientIp || undefined)
          .catch(console.error);

        // Build context and scope
        const context: ApiKeyContext = {
          api_key: apiKeyRecord,
          tenant_id: apiKeyRecord.tenant_id
        };

        // Optional tenant check if provided in query
        const queryTenantId = (query as any)?.tenant_id;
        if (queryTenantId && Number(queryTenantId) !== apiKeyRecord.tenant_id) {
          throw new Error(`Access denied: API key is not authorized for tenant ${queryTenantId}`);
        }

        return {
          isAuthenticated: true,
          apiKeyContext: context,
          rateLimitInfo: {
            limit: apiKeyRecord.rate_limit,
            remaining: rateLimitCheck.remaining,
            resetTime: rateLimitCheck.resetTime.toISOString()
          },
          tenantId: apiKeyRecord.tenant_id,
          scopedQuery: {
            ...(query || {}),
            tenant_id: apiKeyRecord.tenant_id
          }
        };
      } catch (error) {
        console.error('API Key authentication error:', error);
        return {
          isAuthenticated: false,
          error: 'Authentication failed',
          statusCode: 500,
          tenantId: null,
          scopedQuery: query
        };
      }
    })
    .onAfterResponse(async (ctx) => {
      try {
        const apiKeyContext = (ctx as any)?.apiKeyContext as ApiKeyContext | undefined;
        const request = (ctx as any)?.request as Request;
        const response = (ctx as any)?.response as any;
        if (apiKeyContext && 'api_key' in apiKeyContext && 'tenant_id' in apiKeyContext) {
          const responseTime = Date.now();
          const clientIp = ApiKeyMiddleware.getClientIP(request);
          const userAgent = request.headers.get('user-agent');
          const context = apiKeyContext as ApiKeyContext;

          ApiKeyMiddleware.repository
            .logUsage({
              api_key_id: context.api_key.id,
              tenant_id: context.tenant_id,
              endpoint: new URL(request.url).pathname,
              method: request.method,
              ip_address: clientIp || undefined,
              user_agent: userAgent || undefined,
              response_status:
                typeof response === 'object' && response && 'status' in response
                  ? (response.status as number)
                  : undefined,
              response_time_ms: responseTime - (request as any)?.startTime
            })
            .catch(console.error);
        }
      } catch (e) {
        console.error('DEBUG: authenticateAndScope() onAfterResponse failed', e);
      }
    })
    .onError((ctx) => {
      try {
        const code = (ctx as any)?.code as string | undefined;
        const error = (ctx as any)?.error as unknown;
        if (code === 'VALIDATION') {
          return {
            data: null,
            message: 'Validation error',
            status: 400,
            errors: error instanceof Error ? error.message : String(error)
          };
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Access denied') || errorMessage.includes('Authentication')) {
          return {
            data: null,
            message: errorMessage,
            status: 403
          };
        }

        return {
          data: null,
          message: 'Internal server error',
          status: 500,
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        };
      } catch (e) {
        console.error('DEBUG: authenticateAndScope onError failed', e);
        return {
          data: null,
          message: 'Internal server error',
          status: 500
        };
      }
    })
    .onBeforeHandle((ctx) => {
      // Skip authentication for OPTIONS requests (CORS preflight)
      if ((ctx as any).request?.method === 'OPTIONS') return;

      const isAuthenticated = (ctx as any).isAuthenticated;
      if (isAuthenticated === false) {
        const set = (ctx as any).set;
        const status = (ctx as any).statusCode || 401;
        set.status = status as any;
        return {
          data: null,
          message: (ctx as any).error || 'Authentication failed',
          status
        } as any;
      }
    });
