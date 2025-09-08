import Elysia from "elysia";
import { PowerBIRepository } from "./repository";
import { PowerBIController } from "./controller";
import { RepairListQuery, DeviceRepairHistoryQuery } from "./types";
import { db } from "../../db";

const repo = new PowerBIRepository(db);
const controller = new PowerBIController(repo);

export const powerbi_routes = new Elysia({ prefix: '/powerbi' })
  // List repairs with detailed joins for PowerBI
  .get('/repairs', async (ctx) => {
    const { query } = ctx as any;
    return controller.getRepairsList(query as any);
  }, {
    query: RepairListQuery,
    detail: {
      tags: ['PowerBI'],
      summary: 'Get repairs list for PowerBI',
      description: 'Get comprehensive repairs data with device, reason, actor, and warehouse details. Supports filtering by date range, warehouse, and actor.'
    }
  })

  // Get device repair history by IMEI or serial
  .get('/device-repair-history', async (ctx) => {
    const { query } = ctx as any;
    return controller.getDeviceRepairHistory(query as any);
  }, {
    query: DeviceRepairHistoryQuery,
    detail: {
      tags: ['PowerBI'],
      summary: 'Get device repair history',
      description: 'Get complete repair history for a device by IMEI or serial number with all related properties joined.'
    }
  })

export { controller as powerbiController };
