import Elysia, { t } from "elysia";
import { PurchasesRepository } from "./repository";
import { PurchasesController } from "./controller";
import { PurchaseCreate, PurchaseWithItems, PurchaseItemCreate, PurchaseItemUpdate, ReceiveItemsRequest, PurchaseQuery } from "./types";
import { db } from "../../db";
import { requireRole } from "../../auth";

const repo = new PurchasesRepository(db);
const controller = new PurchasesController(repo);

export const purchases_routes = new Elysia({ prefix: '/purchases' })
  .use(requireRole([]))
  
  // List purchases with filtering and pagination
  .get('/', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.listPurchases(query as any, tenantScoped)
  }, { 
    query: PurchaseQuery, 
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'List purchase orders',
      description: 'Get paginated list of purchase orders with filtering by supplier, date, etc.'
    } 
  })

  // List purchases with items included
  .get('/with-items', async (ctx) => {
    const { query, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.listPurchasesWithItems(query as any, tenantScoped)
  }, { 
    query: PurchaseQuery, 
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'List purchase orders with items',
      description: 'Get paginated list of purchase orders with their items and receiving status included'
    } 
  })

  // Get specific purchase order with items and receiving status (using with-items pattern)
  .get('/:id/with-items', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getPurchaseWithItems(Number(params.id), tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'Get purchase order with items',
      description: 'Get a specific purchase order with its items and receiving status using consistent with-items format'
    } 
  })

  // Get specific purchase order with items and receiving status (legacy endpoint)
  .get('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getPurchaseById(Number(params.id), tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'Get purchase order with items (legacy)',
      description: 'Get a specific purchase order with its items and receiving status'
    } 
  })

  // Get receiving status for a purchase
  .get('/:id/status', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getPurchaseReceivingStatus(Number(params.id), tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'Get purchase receiving status',
      description: 'Get detailed receiving status including completion percentage and item-level progress'
    } 
  })

  // Get received items for a purchase
  .get('/:id/received', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.getReceivedItems(Number(params.id), tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'Get received items',
      description: 'Get all items that have been received for a purchase order'
    } 
  })

  // Create new purchase order (simple version)
  .post('/', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    return controller.createPurchase(body as any, currentTenantId)
  }, { 
    body: PurchaseCreate, 
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'Create purchase order',
      description: 'Create a new purchase order (without items). Items can be added separately.'
    } 
  })

  // Create purchase order with items (complete version)
  .post('/with-items', async (ctx) => {
    const { body, currentTenantId } = ctx as any
    return controller.createPurchaseWithItems(body as any, currentTenantId)
  }, { 
    body: PurchaseWithItems, 
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'Create purchase with items',
      description: 'Create a complete purchase order with items in a single request'
    } 
  })

  // Receive items from purchase (key stock operation)
  .post('/:id/receive', async (ctx) => {
    const { params, body, currentTenantId } = ctx as any
    const receiveData = {
      ...body,
      purchase_id: Number(params.id)
    }
    return controller.receiveItems(receiveData as any, currentTenantId)
  }, { 
    body: ReceiveItemsRequest, 
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'Receive purchase items',
      description: 'Record received items from a purchase order. This creates stock movements and updates inventory levels.'
    } 
  })

  // Update purchase item quantity
  .patch('/items/:item_id/quantity', async (ctx) => {
    const { params, body, currentTenantId } = ctx as any
    return controller.updatePurchaseItemQuantity(Number(params.item_id), body as any, currentTenantId)
  }, { 
    body: PurchaseItemUpdate,
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'Update purchase item quantity',
      description: 'Update the quantity of a purchase item. New quantity must be at least equal to the received quantity.'
    } 
  })

  // Add items to existing purchase
  .post('/:id/items', async (ctx) => {
    const { params, body, currentTenantId } = ctx as any
    return controller.addItemsToPurchase(Number(params.id), body as any, currentTenantId)
  }, { 
    body: t.Array(PurchaseItemCreate),
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'Add items to purchase order',
      description: 'Add new items to an existing purchase order'
    } 
  })

  // Delete purchase order
  .delete('/:id', async (ctx) => {
    const { params, currentRole, currentTenantId } = ctx as any
    const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
    return controller.deletePurchase(Number(params.id), tenantScoped)
  }, { 
    detail: { 
      tags: ['Stock Purchases'], 
      summary: 'Delete purchase order',
      description: 'Delete a purchase order. Cannot delete if items have been received.'
    } 
  });

// Export the controller for use by other modules
export { controller as purchasesController };
export { repo as purchasesRepository };
