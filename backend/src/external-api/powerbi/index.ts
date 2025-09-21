import Elysia from "elysia";
import { PowerBIRepository } from "./repository";
import { PowerBIController } from "./controller";
import { RepairListQuery, DeviceRepairHistoryQuery, DeviceListQuery } from "./types";
import { authenticateAndScope } from "../api-keys/middleware";
import { db } from "../../db";

const repo = new PowerBIRepository(db);
const controller = new PowerBIController(repo);

export const powerbi_routes = new Elysia({ prefix: '/powerbi' })
  // Apply authentication and tenant scoping to all PowerBI endpoints
  .use(authenticateAndScope())
  
  // List repairs with detailed joins for PowerBI
  .get('/repairs', async (ctx) => {
    const { scopedQuery } = ctx as any;
    return controller.getRepairsList(scopedQuery as any);
  }, {
    query: RepairListQuery,
    detail: {
      tags: ['PowerBI'],
      summary: 'Get repairs list for PowerBI',
      description: 'Get comprehensive repairs data with device, reason, actor, and warehouse details. Supports filtering by date range, warehouse, and actor. Requires valid API key.'
    }
  })

  // Get device repair history by IMEI or serial
  .get('/device-repair-history', async (ctx) => {
    const { scopedQuery } = ctx as any;
    return controller.getDeviceRepairHistory(scopedQuery as any);
  }, {
    query: DeviceRepairHistoryQuery,
    detail: {
      tags: ['PowerBI'],
      summary: 'Get device repair history',
      description: 'Get complete repair history for a device by IMEI or serial number with all related properties joined. Requires valid API key.'
    }
  })

  // Get devices list with only IMEI, serial, and LPN
  .get('/devices', async (ctx) => {
    const { scopedQuery } = ctx as any;
    return controller.getDevicesList(scopedQuery as any);
  }, {
    query: DeviceListQuery,
    detail: {
      tags: ['PowerBI'],
      summary: 'Get devices list',
      description: 'Get list of devices with only IMEI, serial number, and LPN fields. Automatically scoped to the API key\'s tenant. Requires valid API key.'
    }
  })

export { controller as powerbiController };
