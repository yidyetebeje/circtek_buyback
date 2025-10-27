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

  async createStockInEvent(device_id: number, actor_id: number, tenant_id: number, grade_id: number, remarks?: string): Promise<boolean> {
    return this.createDeviceEvent({
      device_id,
      actor_id,
      event_type: 'TEST_COMPLETED',
      details: { 
        action: 'stock_in', 
        grade_id, 
        remarks: remarks || 'Device graded and stocked in' 
      },
      tenant_id,
    });
  }

  async getDeviceEvents(device_id: number, tenant_id?: number) {
    const conditions = [eq(device_events.device_id, device_id)];
    if (typeof tenant_id === 'number') {
      conditions.push(eq(device_events.tenant_id, tenant_id));
    }

    const events = await this.database
      .select()
      .from(device_events)
      .where(and(...conditions))
      .orderBy(device_events.created_at);

    // Enhance events with additional details
    const enhancedEvents = await Promise.all(
      events.map(async (event) => {
        const enrichedEvent = { ...event };

        // For TEST_COMPLETED events (excluding stock_in), fetch test result details
        if (event.event_type === 'TEST_COMPLETED' && event.details) {
          const details = event.details as any;
          
          // Only fetch test results for non-stock-in events
          if (details.action !== 'stock_in' && details.test_result_id) {
            const testResult = await this.getTestResultDetails(details.test_result_id);
            if (testResult) {
              enrichedEvent.details = {
                ...details,
                failed_components: testResult.failed_components,
                passed_components: testResult.passed_components,
                pending_components: testResult.pending_components,
                battery_info: testResult.battery_info,
              };
            }
          }
        }

        // For REPAIR_COMPLETED events, fetch consumed items with reasons
        if (event.event_type === 'REPAIR_COMPLETED' && event.details) {
          const details = event.details as any;
          const repair_id = details.repair_id;
          let consumed_items = await this.getRepairItemsWithReasons(repair_id);
          
          // Check if consumed_skus is already in the new format (array of objects with part_sku and reason)
          if (consumed_items && Array.isArray(consumed_items) && consumed_items.length > 0) {
            const firstItem = consumed_items[0];
            if (typeof firstItem === 'object' && firstItem.sku !== undefined) {
              // Already in new format, just rename to consumed_items
              enrichedEvent.details = {
                ...details,
                consumed_items: consumed_items,
              };
            } else if (details.repair_id) {
              // Old format (array of strings), fetch from database
              const repairItems = await this.getRepairItemsWithReasons(details.repair_id);
              if (repairItems.length > 0) {
                enrichedEvent.details = {
                  ...details,
                  consumed_items: repairItems,
                };
              }
            }
          } else if (details.repair_id) {
            // No consumed_skus, fetch from database
            const repairItems = await this.getRepairItemsWithReasons(details.repair_id);
            if (repairItems.length > 0) {
              enrichedEvent.details = {
                ...details,
                consumed_items: repairItems,
              };
            }
          }
        }

        return enrichedEvent;
      })
    );

    return enhancedEvents;
  }

  private async getTestResultDetails(test_result_id: number) {
    try {
      const { test_results } = await import('../db/circtek.schema');
      const [result] = await this.database
        .select({
          failed_components: test_results.failed_components,
          passed_components: test_results.passed_components,
          pending_components: test_results.pending_components,
          battery_info: test_results.battery_info,
        })
        .from(test_results)
        .where(eq(test_results.id, test_result_id))
        .limit(1);

      return result || null;
    } catch (error) {
      console.error('Failed to fetch test result details:', error);
      return null;
    }
  }

  private async getRepairItemsWithReasons(repair_id: number) {
    try {
      const { repair_items, repair_reasons } = await import('../db/circtek.schema');
      const items = await this.database
        .select({
          sku: repair_items.sku,
          quantity: repair_items.quantity,
          cost: repair_items.cost,
          description: repair_items.description,
          reason_id: repair_items.reason_id,
          reason_name: repair_reasons.name,
          reason_description: repair_reasons.description,
        })
        .from(repair_items)
        .leftJoin(repair_reasons, eq(repair_items.reason_id, repair_reasons.id))
        .where(eq(repair_items.repair_id, repair_id));

      return items.map(item => ({
        sku: item.sku || 'fixed_price',
        quantity: item.quantity,
        cost: item.cost,
        description: item.description,
        reason: item.reason_name,
        reason_description: item.reason_description,
      }));
    } catch (error) {
      console.error('Failed to fetch repair items with reasons:', error);
      return [];
    }
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
    
  stockIn: (device_id: number, actor_id: number, tenant_id: number, grade_id: number, remarks?: string) => 
    deviceEventsService.createStockInEvent(device_id, actor_id, tenant_id, grade_id, remarks),
};
