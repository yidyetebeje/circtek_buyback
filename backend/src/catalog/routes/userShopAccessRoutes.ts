import { Elysia, t } from 'elysia';
import { userShopAccessController } from '../controllers/userShopAccessController';
import { authMiddleware } from '@/middleware/auth';


const GrantAccessSchema = t.Object({
  userId: t.Number({ minimum: 1 }),
  shopId: t.Number({ minimum: 1 }),
  canView: t.Optional(t.Boolean()),
  canEdit: t.Optional(t.Boolean())
});

const UpdateAccessSchema = t.Object({
  canView: t.Optional(t.Boolean()),
  canEdit: t.Optional(t.Boolean())
});

export const userShopAccessRoutes = new Elysia({ prefix: '/shop-access' })
  .use(authMiddleware.isAuthenticated)
  .get('/user/:userId', async ({ params, user, ...ctx }) => {
    const userId = parseInt(params.userId, 10);
    return userShopAccessController.getUserShops(userId, { ...ctx, params, user });
  }, {
    params: t.Object({
      userId: t.String()
    }),
    detail: {
      summary: 'Get shops a user has access to',
      tags: ['Shop Access']
    }
  })

  .get('/shop/:shopId', async ({ params, user, ...ctx }) => {
    const shopId = parseInt(params.shopId, 10);
    return userShopAccessController.getShopUsers(shopId, { ...ctx, params, user });
  }, {
    params: t.Object({
      shopId: t.String()
    }),
    detail: {
      summary: 'Get users with access to a shop',
      tags: ['Shop Access']
    }
  })

  .post('/', async ({ body, user, ...ctx }) => {
    return userShopAccessController.grantAccess(body, { ...ctx, body, user });
  }, {
    body: GrantAccessSchema,
    detail: {
      summary: 'Grant a user access to a shop',
      tags: ['Shop Access']
    }
  })

  // Update a user's access to a shop
  .put('/user/:userId/shop/:shopId', async ({ params, body, user, ...ctx }) => {
    const userId = parseInt(params.userId, 10);
    const shopId = parseInt(params.shopId, 10);
    return userShopAccessController.updateAccess(userId, shopId, body, { ...ctx, params, body, user });
  }, {
    params: t.Object({
      userId: t.String(),
      shopId: t.String()
    }),
    body: UpdateAccessSchema,
    detail: {
      summary: 'Update a user\'s access to a shop',
      tags: ['Shop Access']
    }
  })

  // Revoke a user's access to a shop
  .delete('/user/:userId/shop/:shopId', async ({ params, user, ...ctx }) => {
    const userId = parseInt(params.userId, 10);
    const shopId = parseInt(params.shopId, 10);
    return userShopAccessController.revokeAccess(userId, shopId, { ...ctx, params, user });
  }, {
    params: t.Object({
      userId: t.String(),
      shopId: t.String()
    }),
    detail: {
      summary: 'Revoke a user\'s access to a shop',
      tags: ['Shop Access']
    }
  }); 