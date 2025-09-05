import { eq, and } from "drizzle-orm";
import { device_events } from "../db/circtek.schema";
import { DeviceEventCreateInput } from "./types";
import { db } from "../db/index";

/**
 * Device Events Integration for Stock Management
 * 
 * This module provides functions to create device events when stock operations
 * affect specific devices (especially for transfers, adjustments, and write-offs)
 */

export class DeviceEventsService {
  constructor(private readonly database: typeof db) {}

  async createDeviceEvent(eventData: DeviceEventCreateInput): Promise<boolean> {
    try {
      await this.database.insert(device_events).values(eventData);
      return true;
    } catch (error) {
      console.error('Failed to create device event:', error);
      return false;
    }
  }

  async createTransferOutEvent(device_id: number, actor_id: number, tenant_id: number, transfer_id: number): Promise<boolean> {
    return this.createDeviceEvent({
      device_id,
      actor_id,
      event_type: 'TRANSFER_OUT',
      details: { transfer_id, action: 'device_transferred_out' },
      tenant_id,
    });
  }

  async createTransferInEvent(device_id: number, actor_id: number, tenant_id: number, transfer_id: number): Promise<boolean> {
    return this.createDeviceEvent({
      device_id,
      actor_id,
      event_type: 'TRANSFER_IN',
      details: { transfer_id, action: 'device_transferred_in' },
      tenant_id,
    });
  }

  async createDeadIMEIEvent(device_id: number, actor_id: number, tenant_id: number, reason?: string): Promise<boolean> {
    return this.createDeviceEvent({
      device_id,
      actor_id,
      event_type: 'DEAD_IMEI',
      details: { reason: reason || 'Device marked as dead IMEI', action: 'write_off' },
      tenant_id,
    });
  }

  async createAdjustmentEvent(device_id: number, actor_id: number, tenant_id: number, adjustment_type: string, details?: any): Promise<boolean> {
    return this.createDeviceEvent({
      device_id,
      actor_id,
      event_type: 'ADJUSTMENT',
      details: { adjustment_type, ...details },
      tenant_id,
    });
  }

  async getDeviceEvents(device_id: number, tenant_id?: number) {
    const conditions = [eq(device_events.device_id, device_id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(device_events.tenant_id, tenant_id));
    }

    return this.database
      .select()
      .from(device_events)
      .where(and(...conditions))
      .orderBy(device_events.created_at);
  }
}

// Create singleton instance
export const deviceEventsService = new DeviceEventsService(db);

// Utility functions for easy integration with stock modules
export const createDeviceEvents = {
  transferOut: (device_id: number, actor_id: number, tenant_id: number, transfer_id: number) => 
    deviceEventsService.createTransferOutEvent(device_id, actor_id, tenant_id, transfer_id),
    
  transferIn: (device_id: number, actor_id: number, tenant_id: number, transfer_id: number) => 
    deviceEventsService.createTransferInEvent(device_id, actor_id, tenant_id, transfer_id),
    
  deadIMEI: (device_id: number, actor_id: number, tenant_id: number, reason?: string) => 
    deviceEventsService.createDeadIMEIEvent(device_id, actor_id, tenant_id, reason),
    
  adjustment: (device_id: number, actor_id: number, tenant_id: number, adjustment_type: string, details?: any) => 
    deviceEventsService.createAdjustmentEvent(device_id, actor_id, tenant_id, adjustment_type, details),
};
