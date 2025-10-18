import { DiagnosticsController } from './controller'
import { DiagnosticsRepository } from './repository'
import { db } from '../db'

interface MigrationConfig {
	testerId: number
	tenantId: number
	warehouseId: number
	token: string
}

interface MigrationResult {
	success: number
	failed: number
	errors: Array<{ record: any; error: string }>
}

/**
 * Safely parse JSON string or return the value if already parsed
 */
function safeJsonParse(value: any): any {
	if (!value) return null
	if (typeof value === 'object') return value
	if (typeof value === 'string') {
		try {
			return JSON.parse(value)
		} catch {
			return null
		}
	}
	return null
}

/**
 * Transform old data record to new format
 */
export function transformOldRecord(oldRecord: any) {
	const batteryInfo = safeJsonParse(oldRecord.batteryInfo)
	const testInfo = oldRecord.testInfo || { passedResult: '', failedResult: '', pendingResult: '' }

	// Extract original timestamps from old data
	const originalCreatedAt = oldRecord.transCreatedAt || oldRecord.createdAt || null
	const originalUpdatedAt = oldRecord.transUpdatedAt || oldRecord.updatedAt || null

	return {
		device: {
			device_type: 'iPhone',
			make: oldRecord.make || 'unknown',
			model_no: oldRecord.modelNo || '',
			model_name: oldRecord.modelName || '',
			serial: oldRecord.serial || '',
			imei: oldRecord.imei || undefined,
			imei2: oldRecord.imei2 || undefined,
			lpn: oldRecord.lpn || undefined,
			sku: oldRecord.skuCode || undefined,
			storage: oldRecord.storage || undefined,
			memory: oldRecord.memory || undefined,
			color: oldRecord.colorName || undefined,
			guid: oldRecord.udid || oldRecord.guid || undefined,
		},
		test: {
			battery_info: batteryInfo,
			passed_components: testInfo.passedResult || '',
			failed_components: testInfo.failedResult || '',
			pending_components: testInfo.pendingResult || '',
			oem_status: oldRecord.oemStatus || undefined,
			oem_info: safeJsonParse(oldRecord.oemParts),
			lpn: oldRecord.lpn || undefined,
			os_version: oldRecord.osVersion || undefined,
			device_lock: oldRecord.deviceLock || undefined,
			carrier_lock: safeJsonParse(oldRecord.carrierLockResponse),
			sim_lock: safeJsonParse(oldRecord.simLockResponse),
			ESN: oldRecord.esnStatus || undefined,
			iCloud: safeJsonParse(oldRecord.iCloudResponse),
			eSIM: oldRecord.esimPresent === 1 ? true : oldRecord.esimPresent === 0 ? false : undefined,
			eSIM_erasure: oldRecord.esimErased === 1 ? true : oldRecord.esimErased === 0 ? false : undefined,
			serial_number: oldRecord.serial || undefined,
			imei: oldRecord.imei || undefined,
		},
		// Include original timestamps to preserve testing time
		timestamps: {
			created_at: originalCreatedAt,
			updated_at: originalUpdatedAt,
		},
	}
}

/**
 * Migrate old database records to new system (using batch method)
 */
export async function migrateOldDataBatch(
	oldRecords: any[],
	config: MigrationConfig
): Promise<MigrationResult> {
	const repo = new DiagnosticsRepository(db)
	const controller = new DiagnosticsController(repo)

	// Transform all records
	const transformed = oldRecords.map(transformOldRecord).filter((record) => record.device.model_name !== null)

	// Extract timestamps and separate them from the main data
	const transformedData = transformed.map(({ timestamps, ...data }) => ({
		...data,
		customTimestamps: timestamps,
	}))

	// Use batch migrate method
	const response = await controller.batchMigrate(
		transformedData,
		config.testerId,
		config.tenantId,
		config.warehouseId
	)

	// Map errors back to original records
	const errors = response.data.errors.map((err) => ({
		record: oldRecords[err.index],
		error: err.error,
	}))

	return {
		success: response.data.success,
		failed: response.data.failed,
		errors,
	}
}

/**
 * Migrate old database records to new system (one by one with detailed logging)
 */
export async function migrateOldData(
	oldRecords: any[],
	config: MigrationConfig
): Promise<MigrationResult> {
	const repo = new DiagnosticsRepository(db)
	const controller = new DiagnosticsController(repo)

	const result: MigrationResult = {
		success: 0,
		failed: 0,
		errors: [],
	}
    let count = 0;
	for (const oldRecord of oldRecords) {
		count++
		if (count % 10 === 0) {
			console.log(`✅ Migrated: ${count} records`)
			await new Promise(resolve => setTimeout(resolve, 1000))
		}
		try {
			const transformed = transformOldRecord(oldRecord)
			
			// Extract timestamps from the transformed data
			const { timestamps, ...uploadData } = transformed
			
			const response = await fetch('https://staging-db-api.circtek.io/api/v1/diagnostics/tests/upload', {
				method: 'POST',
				body: JSON.stringify({
					...uploadData,
					// Include custom timestamps in the request body
					customTimestamps: timestamps,
				}),
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${config.token}`,
				},
			})
			console.log(response, "response")

			if (response.status >= 200 && response.status < 300) {
				result.success++
				console.log(`✓ Migrated: ${oldRecord.imei || oldRecord.serial}${timestamps?.created_at ? ` (preserved timestamp: ${timestamps.created_at})` : ''}`)
			} else {
				const responseBody = await response.json()
				console.log(responseBody, "responseBody")
				result.failed++
				const errorMessage = responseBody.message || `HTTP ${response.status}: ${response.statusText}`
				result.errors.push({ record: oldRecord, error: errorMessage })
				console.error(`✗ Failed: ${oldRecord.imei || oldRecord.serial} - ${errorMessage}`)
			}
		} catch (error) {
			result.failed++
			const errorMsg = error instanceof Error ? error.message : String(error)
			result.errors.push({ record: oldRecord, error: errorMsg })
			console.error(`✗ Error: ${oldRecord.imei || oldRecord.serial} - ${errorMsg}`)
		}
	}

	return result
}
