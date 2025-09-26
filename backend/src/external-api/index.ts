import Elysia from "elysia";
import { powerbi_routes } from "./powerbi";
import { api_key_routes } from "./api-keys";
import { authenticateAndScope } from "./api-keys/middleware";

// Main external API routes that combines all external integrations
export const external_api_routes = new Elysia({ prefix: '/external-api' })
  // API Key Management routes (protected by regular user authentication)
  .use(api_key_routes)
  
  // PowerBI integration routes (protected by API key authentication)
  .use(authenticateAndScope())
  .use(powerbi_routes)

  // Health check endpoint
  .get('/health', () => {
    return {
      data: {
        status: 'healthy',
        modules: [
          'api-key-management',
          'powerbi'
        ],
        timestamp: new Date().toISOString()
      },
      message: 'External API system is operational',
      status: 200
    }
  }, {
    detail: {
      tags: ['External API'],
      summary: 'Health check',
      description: 'Check if the external API system is operational'
    }
  });

export default external_api_routes;
