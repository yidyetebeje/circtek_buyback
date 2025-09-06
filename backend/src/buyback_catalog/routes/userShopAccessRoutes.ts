import { Elysia, t } from 'elysia';
import { userShopAccessController } from '../controllers/userShopAccessController';
import { requireRole } from '../../auth';


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
  .use(requireRole([]))
  .get('/user/:userId', async ({ params, ...ctx }) => {
    const userId = parseInt(params.userId, 10);
    return userShopAccessController.getUserShops(userId, ctx as any);
  }, {
    params: t.Object({
      userId: t.String()
    }),
    detail: {
      summary: 'Get shops a user has access to',
      tags: ['Shop Access']
    }
  })

  .get('/shop/:shopId', async ({ params, ...ctx }) => {
    const shopId = parseInt(params.shopId, 10);
    return userShopAccessController.getShopUsers(shopId, ctx as any);
  }, {
    params: t.Object({
      shopId: t.String()
    }),
    detail: {
      summary: 'Get users with access to a shop',
      tags: ['Shop Access']
    }
  })

  .post('/grant', async ({ body, ...ctx }) => {
    return userShopAccessController.grantAccess(body, ctx as any);
  }, {
    body: GrantAccessSchema,
    detail: {
      summary: 'Grant a user access to a shop',
      tags: ['Shop Access']
    }
  })

  .put('/:userId/:shopId', async ({ params, body, ...ctx }) => {
    const userId = parseInt(params.userId, 10);
    const shopId = parseInt(params.shopId, 10);
    return userShopAccessController.updateAccess(userId, shopId, body, ctx as any);
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

  .delete('/:userId/:shopId', async ({ params, ...ctx }) => {
    const userId = parseInt(params.userId, 10);
    const shopId = parseInt(params.shopId, 10);
    return userShopAccessController.revokeAccess(userId, shopId, ctx as any);
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