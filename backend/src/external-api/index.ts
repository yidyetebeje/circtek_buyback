import Elysia from "elysia";
import { powerbi_routes } from "./powerbi";

// Main external API routes that combines all external integrations
export const external_api_routes = new Elysia({ prefix: '/external-api' })
  // PowerBI integration routes
  .use(powerbi_routes)

  // Health check endpoint
  .get('/health', () => {
    return {
      data: {
        status: 'healthy',
        modules: [
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
