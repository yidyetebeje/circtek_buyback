import type { response } from '../types/response'
import { deviceEventsService } from '../stock/device-events'
import { DiagnosticsRepository } from './repository'
import { DiagnosticListQueryInput, DiagnosticPublic, DiagnosticUploadInput } from './types'

export class DiagnosticsController {
	constructor(private readonly repo: DiagnosticsRepository) {}

	async list(query: DiagnosticListQueryInput, tenantId: number, role?: string): Promise<response<DiagnosticPublic[]>> {
		const effectiveTenantId = role === 'super_admin' ? query.tenant_id : tenantId
		const { rows, total, page, limit } = await this.repo.list({ ...query, tenant_id: effectiveTenantId })
		return { data: rows, message: 'OK', status: 200, meta: { total, page, limit } }
	}

	async export(query: DiagnosticListQueryInput, tenantId: number, role?: string): Promise<{ headers: Record<string, string>; body: string; status: number }> {
		const effectiveTenantId = role === 'super_admin' ? query.tenant_id : tenantId
		const rows = await this.repo.exportAll({ ...query, tenant_id: effectiveTenantId })
		const header = [
			// Remove internal IDs and prefer descriptive fields
			'created_at','updated_at','warehouse_name','tester_username',
			'make','model_no','model_name','device_type','device_serial','device_imei','device_lpn','device_sku','device_imei2','device_guid','device_description','device_storage','device_memory','device_color','device_created_at','device_status',
			'lpn','serial_number','imei','passed_components','failed_components','pending_components',
			'oem_status','battery_info','oem_info','label_printed','status','os_version','device_lock','carrier_lock','sim_lock','ESN','iCloud','eSIM','eSIM_erasure'
		]
		const csv = [
			header.join(','),
			...rows.map(r => [
				// Prefer descriptive fields over internal IDs
				r.created_at ? new Date(r.created_at).toISOString() : '',
				r.updated_at ? new Date(r.updated_at).toISOString() : '',
				r.warehouse_name ?? '',
				r.tester_username ?? '',
				r.make ?? '',
				r.model_no ?? '',
				r.model_name ?? '',
				r.device_type ?? '',
				r.device_serial ?? '',
				r.device_imei ?? '',
				r.device_lpn ?? '',
				r.device_sku ?? '',
				r.device_imei2 ?? '',
				r.device_guid ?? '',
				r.device_description ?? '',
				r.device_storage ?? '',
				r.device_memory ?? '',
				r.device_color ?? '',
				r.device_created_at ? new Date(r.device_created_at).toISOString() : '',
				r.device_status ?? '',
				r.lpn ?? '',
				r.serial_number ?? '',
				r.imei ?? '',
				r.passed_components ?? '',
				r.failed_components ?? '',
				r.pending_components ?? '',
				r.oem_status ?? '',
				JSON.stringify(r.battery_info ?? null),
				JSON.stringify(r.oem_info ?? null),
				r.label_printed ?? '',
				r.status ?? '',
				r.os_version ?? '',
				r.device_lock ?? '',
				JSON.stringify(r.carrier_lock ?? null),
				JSON.stringify(r.sim_lock ?? null),
				r.ESN ?? '',
				JSON.stringify(r.iCloud ?? null),
				r.eSIM ?? '',
				r.eSIM_erasure ?? ''
			].map(v => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g, '""')}"` : String(v)).join(',')
			)
		].join('\n')
		return {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': 'attachment; filename="test_results.csv"',
			},
			body: csv,
			status: 200,
		}
	}

	async upload(body: DiagnosticUploadInput, testerId: number, tenantId: number): Promise<response<DiagnosticPublic | null>> {
	
		// Fire TEST_COMPLETED device event if a device was associated
		try {
			const created = await this.repo.upload(body, testerId, tenantId)
			if (created?.device_id) {
				
				await deviceEventsService.createDeviceEvent({
					device_id: created.device_id,
					actor_id: testerId,
					event_type: 'TEST_COMPLETED',
					details: {
						make: created.make,
						model_name: created.model_name,
						serial_number: created.serial_number,
						imei: created.imei,
						lpn: created.lpn,
						warehouse_name: created.warehouse_name,
						tester_username: created.tester_username,
					},
					tenant_id: tenantId,
				})
			}
			
			const returned = { data: created ?? null, message: 'Uploaded', status: 201 }
			
			return returned
		} catch (e) {
			
			if (process.env.NODE_ENV === 'test') {
				console.error('Failed to create TEST_COMPLETED device event', e)
			}
			return { data: null, message: 'Failed to upload', status: 500 }
		}
		
	}

	async getPublicReport(id: number): Promise<response<DiagnosticPublic | null>> {
		const found = await this.repo.findById(id)
		if (!found) return { data: null, message: 'Not found', status: 404 }
		// Include branding hints if available from repository row (tenant fields)
		// Some databases may not hydrate these; repository can optionally join.
		return { data: found, message: 'OK', status: 200 }
	}
}


