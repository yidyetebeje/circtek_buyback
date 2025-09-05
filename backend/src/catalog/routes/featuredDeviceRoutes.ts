import Elysia, { t, type Context } from 'elysia';
import { featuredDeviceController } from '@/catalog/controllers/featuredDeviceController';
import { NewFeaturedDeviceSchema, UpdateFeaturedDeviceSchema } from '@/catalog/types/featuredDeviceTypes';
import { authMiddleware, type JwtUser } from '@/middleware/auth';

// Create a base Elysia instance for all featured device-related routes
export const featuredDeviceRoutes = new Elysia({ prefix: '/featured-devices' });
const publicFeaturedDeviceApi = new Elysia()
  .get('/', 
    async ({ query, ...ctx }) => {
      return featuredDeviceController.getAll({ 
        ...ctx, 
        query: query as unknown as Record<string, string>, 
        user: undefined
      });
    }, 
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.Enum({ createdAt: 'createdAt', updatedAt: 'updatedAt' }, { default: 'createdAt' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'desc' })),
        shopId: t.Optional(t.Numeric()),
        modelId: t.Optional(t.Numeric()),
        clientId: t.Optional(t.Numeric()), // This might be used for public filtering
        isPublished: t.Optional(t.Boolean({ default: true })) // Default to true for public view
      }),
      detail: {
        summary: 'Get List of Published Featured Devices',
        description: 'Retrieves a list of featured devices, typically filtered to show only published items for public access.',
        tags: ['Featured Devices (Public)']
      }
    }
  )
  .get('/:id',
    async ({ params, query, ...ctx }) => {
      const numericId = parseInt(params.id, 10);
      if (isNaN(numericId)) {
        ctx.set.status = 400;
        return { error: 'Invalid ID format. ID must be a number.' };
      }
      // User is not available here.
      // Ensure featuredDeviceController.getById can handle 'user' being undefined.
      return featuredDeviceController.getById(numericId, { 
        ...ctx, 
        params, 
        query: query || {}, // Ensure query is an object
        user: undefined // Explicitly pass undefined
      });
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Optional(t.Object({ // Making query optional for getById
        // Add any specific query params if needed for public GET by ID
      })),
      detail: {
        summary: 'Get Published Featured Device by ID',
        description: 'Retrieves a specific featured device by its ID, typically if it is published.',
        tags: ['Featured Devices (Public)']
      }
    }
  );

const protectedFeaturedDeviceApi = new Elysia()
  .use(authMiddleware.isAuthenticated)
  .post('/', 
    async ({ body, query, user, ...ctx }) => {
      // 'user' is guaranteed to be available here due to authMiddleware
      return featuredDeviceController.create(body, { ...ctx, body, query: query || {}, user: user as JwtUser }); 
    }, 
    {
      body: NewFeaturedDeviceSchema,
      detail: { 
        summary: 'Create a new Featured Device entry (Admin)',
        tags: ['Featured Devices (Admin)'] 
      }
    }
  )
  // Example: If you need an authenticated version of GET all (e.g., to see unpublished items)
  // You could add it here, perhaps with a different path or rely on query params + auth context
  .get('/all', 
    async ({ query, user, ...ctx }) => {
      // user is guaranteed by authMiddleware.isAuthenticated
      return featuredDeviceController.getAll({ 
        ...ctx, 
        query,
        user: user as JwtUser 
      });
    }, 
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, default: 20 })),
        orderBy: t.Optional(t.Enum({ createdAt: 'createdAt', updatedAt: 'updatedAt' }, { default: 'createdAt' })),
        order: t.Optional(t.Enum({ asc: 'asc', desc: 'desc' }, { default: 'desc' })),
        shopId: t.Optional(t.Numeric()),
        modelId: t.Optional(t.Numeric()),
        clientId: t.Optional(t.Numeric()), // Allows super-admin to filter by client
        isPublished: t.Optional(t.Boolean()), // Authenticated users can filter by true, false, or omit for all
        modelTitle: t.Optional(t.String()),
        shopName: t.Optional(t.String())
      }),
      detail: {
        summary: 'Get List of All Featured Devices (Authenticated)',
        description: 'Retrieves a list of all featured devices. Authenticated users (e.g., admins) can see unpublished items and filter by various parameters.',
        tags: ['Featured Devices (Admin)']
      }
    }
  )
  .put('/:id',
    async ({ params, body, query, user, ...ctx }) => {
      const numericId = parseInt(params.id, 10);
      if (isNaN(numericId)) {
        ctx.set.status = 400;
        return { error: 'Invalid ID format. ID must be a number.' };
      }
      return featuredDeviceController.update(numericId, body, { ...ctx, params, body, query: query || {}, user: user as JwtUser });
    },
    {
      params: t.Object({ id: t.String() }),
      body: UpdateFeaturedDeviceSchema,
      detail: {
        summary: 'Update Featured Device by ID (Admin, e.g., publish/unpublish)',
        tags: ['Featured Devices (Admin)']
      }
    }
  )
  .delete('/:id',
    async ({ params, query, user, ...ctx }) => {
      const numericId = parseInt(params.id, 10);
      if (isNaN(numericId)) {
        ctx.set.status = 400;
        return { error: 'Invalid ID format. ID must be a number.' };
      }
      return featuredDeviceController.delete(numericId, { ...ctx, params, query: query || {}, user: user as JwtUser });
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        summary: 'Delete Featured Device by ID (Admin)',
        tags: ['Featured Devices (Admin)']
      }
    }
  );

// Register the public and protected route groups to the main featuredDeviceRoutes
featuredDeviceRoutes
  .use(publicFeaturedDeviceApi)
  .use(protectedFeaturedDeviceApi);
