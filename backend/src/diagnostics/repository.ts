import { and, asc, count, desc, eq, like, or, SQL } from 'drizzle-orm'
import { db } from '../db'
import { devices, test_results, users as usersTable, warehouses as warehousesTable, diagnostic_question_answers } from '../db/circtek.schema'
import { DiagnosticFilters, DiagnosticListResult, DiagnosticPublic, DiagnosticUploadInput } from './types'

const diagnosticSelection = {
	id: test_results.id,
	created_at: test_results.created_at,
	updated_at: test_results.updated_at,
	tenant_id: test_results.tenant_id,
	warehouse_id: test_results.warehouse_id,
	tester_id: test_results.tester_id,
	device_id: test_results.device_id,
	lpn: test_results.lpn,
	serial_number: test_results.serial_number,
	imei: test_results.imei,
	passed_components: test_results.passed_components,
	failed_components: test_results.failed_components,
	pending_components: test_results.pending_components,
	oem_status: test_results.oem_status,
	battery_info: test_results.battery_info,
	oem_info: test_results.oem_info,
	label_printed: test_results.label_printed,
	status: test_results.status,
	os_version: test_results.os_version,
	device_lock: test_results.device_lock,
	carrier_lock: test_results.carrier_lock,
	sim_lock: test_results.sim_lock,
	ESN: test_results.ESN,
	iCloud: test_results.iCloud,
	eSIM: test_results.eSIM,
	eSIM_erasure: test_results.eSIM_erasure,
	make: devices.make,
	model_no: devices.model_no,
	model_name: devices.model_name,
	device_type: devices.device_type,
	device_serial: devices.serial,
	device_imei: devices.imei,
	device_lpn: devices.lpn,
	device_sku: devices.sku,
	device_imei2: devices.imei2,
	device_guid: devices.guid,
	device_description: devices.description,
	device_storage: devices.storage,
	device_memory: devices.memory,
	device_color: devices.color,
	device_edited_color: devices.edited_color,
	device_created_at: devices.created_at,
	device_status: devices.status,
	warehouse_name: warehousesTable.name,
	tester_username: usersTable.user_name,
	rooted: test_results.rooted,
	erased: test_results.erased,
	grade: test_results.grade,
}

export class DiagnosticsRepository {
	constructor(private readonly database: typeof db) { }

	async list(filters: DiagnosticFilters): Promise<DiagnosticListResult> {
		const conditions: any[] = []
		if (filters.identifier) {
			const pattern = `%${filters.identifier}%`
			conditions.push(or(
				like(test_results.lpn, pattern),
				like(test_results.serial_number, pattern),
				like(test_results.imei, pattern),
				like(devices.lpn, pattern),
				like(devices.serial, pattern),
				like(devices.imei, pattern),
			))
		}
		if (typeof filters.tenant_id === 'number') conditions.push(eq(test_results.tenant_id, filters.tenant_id))
		if (filters.device_type) conditions.push(eq(devices.device_type, filters.device_type as any))
		if (typeof filters.warehouse_id === 'number') conditions.push(eq(test_results.warehouse_id, filters.warehouse_id))
		if (typeof filters.tester_id === 'number') conditions.push(eq(test_results.tester_id, filters.tester_id))

		const page = Math.max(1, filters.page ?? 1)
		const limit = Math.max(1, Math.min(100, filters.limit ?? 10))
		const offset = (page - 1) * limit

		const whereCond = conditions.length ? (and(...conditions) as any) : undefined

		// Sorting mapping
		const sortDir = (filters.sort_dir === 'asc' || filters.sort_dir === 'desc') ? filters.sort_dir : 'desc'
		const column = (() => {
			switch (filters.sort_by) {
				case 'id': return test_results.id
				case 'created_at': return test_results.created_at
				case 'lpn': return test_results.lpn
				case 'serial_number': return test_results.serial_number
				case 'imei': return test_results.imei
				case 'make': return devices.make
				case 'model_name': return devices.model_name
				case 'status': return test_results.status
				default: return test_results.created_at
			}
		})()
		const orderExpr = sortDir === 'asc' ? asc(column as any) : desc(column as any)

		const baseFrom = this.database
			.select(diagnosticSelection)
			.from(test_results)
			.leftJoin(devices, eq(test_results.device_id, devices.id))
			.leftJoin(warehousesTable, eq(test_results.warehouse_id, warehousesTable.id))
			.leftJoin(usersTable, eq(test_results.tester_id, usersTable.id))

		const [totalRow] = await (whereCond
			? this.database
				.select({ total: count() })
				.from(test_results)
				.leftJoin(devices, eq(test_results.device_id, devices.id))
				.leftJoin(warehousesTable, eq(test_results.warehouse_id, warehousesTable.id))
				.leftJoin(usersTable, eq(test_results.tester_id, usersTable.id))
				.where(whereCond)
			: this.database
				.select({ total: count() })
				.from(test_results)
				.leftJoin(devices, eq(test_results.device_id, devices.id))
				.leftJoin(warehousesTable, eq(test_results.warehouse_id, warehousesTable.id))
				.leftJoin(usersTable, eq(test_results.tester_id, usersTable.id)))

		const rows = await (whereCond
			? baseFrom.where(whereCond).orderBy(orderExpr).limit(limit).offset(offset)
			: baseFrom.orderBy(orderExpr).limit(limit).offset(offset))

		// Fetch answers for each test result
		const rowsWithAnswers = await Promise.all(
			rows.map(async (row) => {
				let answers: any[] = [];
				try {
					answers = await this.database
						.select({
							id: diagnostic_question_answers.id,
							question_text: diagnostic_question_answers.question_text,
							answer_text: diagnostic_question_answers.answer_text,
							created_at: diagnostic_question_answers.created_at,
							test_result_id: diagnostic_question_answers.test_result_id
						})
						.from(diagnostic_question_answers)
						.where(eq(diagnostic_question_answers.test_result_id, row.id))
						.orderBy(diagnostic_question_answers.created_at)
				} catch (error) {
					console.error(`Failed to fetch answers for test_result_id: ${row.id}`, error);
					// Continue with empty answers if query fails
				}

				return {
					...row,
					device_color: row.device_edited_color || row.device_color,
					answers: answers.length > 0 ? answers : []
				}
			})
		)

		console.log(rowsWithAnswers, "rows from the underground with answers");
		return { rows: rowsWithAnswers as unknown as DiagnosticPublic[], total: totalRow?.total ?? 0, page, limit }
	}

	async exportAll(filters: DiagnosticFilters): Promise<DiagnosticPublic[]> {
		const conditions: any[] = []
		if (filters.identifier) {
			const pattern = `%${filters.identifier}%`
			conditions.push(or(
				like(test_results.lpn, pattern),
				like(test_results.serial_number, pattern),
				like(test_results.imei, pattern),
				like(devices.lpn, pattern),
				like(devices.serial, pattern),
				like(devices.imei, pattern),
			))
		}
		if (typeof filters.tenant_id === 'number') conditions.push(eq(test_results.tenant_id, filters.tenant_id))
		if (filters.device_type) conditions.push(eq(devices.device_type, filters.device_type as any))
		const whereCond = conditions.length ? (and(...conditions) as any) : undefined

		// Sorting mapping (reuse default)
		const sortDir = (filters.sort_dir === 'asc' || filters.sort_dir === 'desc') ? filters.sort_dir : 'desc'
		const column = (() => {
			switch (filters.sort_by) {
				case 'id': return test_results.id
				case 'created_at': return test_results.created_at
				case 'lpn': return test_results.lpn
				case 'serial_number': return test_results.serial_number
				case 'imei': return test_results.imei
				case 'make': return devices.make
				case 'model_name': return devices.model_name
				case 'status': return test_results.status
				default: return test_results.created_at
			}
		})()
		const orderExpr = sortDir === 'asc' ? asc(column as any) : desc(column as any)

		const baseFrom = this.database
			.select(diagnosticSelection)
			.from(test_results)
			.leftJoin(devices, eq(test_results.device_id, devices.id))
			.leftJoin(warehousesTable, eq(test_results.warehouse_id, warehousesTable.id))
			.leftJoin(usersTable, eq(test_results.tester_id, usersTable.id))

		const rows = await (whereCond ? baseFrom.where(whereCond).orderBy(orderExpr) : baseFrom.orderBy(orderExpr))
		return rows as unknown as DiagnosticPublic[]
	}

	async upload(input: DiagnosticUploadInput, testerId: number, tenantId: number, warehouseId: number, customTimestamps?: { created_at?: string | Date; updated_at?: string | Date }): Promise<DiagnosticPublic | undefined> {
		// Ensure device exists or create it
		const deviceToInsert = {
			make: input.device.make.toLowerCase(),
			model_no: input.device.model_no,
			model_name: input.device.model_name,
			device_type: input.device.device_type as any,
			serial: (input.device.serial?.length || 0) > 0 ? input.device.serial : input.device.imei,
			imei: (input.device.imei?.length || 0) > 0 ? input.device.imei : input.device.serial,
			imei2: input.device.imei2,
			guid: input.device.guid,
			description: input.device.description ?? `${input.device.make} ${input.device.model_name}`,
			status: 1 as any,
			tenant_id: tenantId,
			warehouse_id: warehouseId, // Add warehouse_id from test input
			lpn: input.device.lpn,
			sku: input.device.sku,
			storage: input.device.storage,
			memory: input.device.memory,
			color: input.device.color,
			grade: input.test.grade,
		}

		const conditionsForDevice: any[] = [eq(devices.tenant_id, tenantId)]
		const identifierConds: any[] = []
		if (deviceToInsert.serial) identifierConds.push(eq(devices.serial, deviceToInsert.serial))
		if (deviceToInsert.imei) identifierConds.push(eq(devices.imei, deviceToInsert.imei))
		if (deviceToInsert.imei2) identifierConds.push(eq(devices.imei2, deviceToInsert.imei2))
		if (deviceToInsert.guid) identifierConds.push(eq(devices.guid, deviceToInsert.guid))
		if (identifierConds.length) conditionsForDevice.push(or(...identifierConds) as any)
		const deviceWhere = and(...conditionsForDevice) as any

		let [existingDevice] = await this.database
			.select({ id: devices.id })
			.from(devices)
			.where(deviceWhere)

		if (!existingDevice) {
			await this.database.insert(devices).values(deviceToInsert)
				;[existingDevice] = await this.database
					.select({ id: devices.id })
					.from(devices)
					.where(deviceWhere)
		} else {
			await this.database.update(devices).set(deviceToInsert).where(eq(devices.id, existingDevice.id))
				;[existingDevice] = await this.database
					.select({ id: devices.id })
					.from(devices)
					.where(deviceWhere)
		}

		const toInsertTest = {
			tenant_id: tenantId,
			device_id: existingDevice.id,
			warehouse_id: warehouseId,
			tester_id: testerId,
			battery_info: input.test.battery_info as any,
			passed_components: input.test.passed_components,
			failed_components: input.test.failed_components,
			pending_components: input.test.pending_components,
			oem_status: input.test.oem_status,
			oem_info: input.test.oem_info as any,
			lpn: input.test.lpn ?? deviceToInsert.lpn,
			status: 1 as any,
			os_version: input.test.os_version,
			device_lock: input.test.device_lock,
			carrier_lock: input.test.carrier_lock as any,
			sim_lock: input.test.sim_lock as any,
			ESN: input.test.ESN,
			iCloud: input.test.iCloud as any,
			eSIM: input.test.eSIM as any,
			eSIM_erasure: input.test.eSIM_erasure as any,
			serial_number: input.test.serial_number ?? deviceToInsert.serial,
			imei: input.test.imei ?? deviceToInsert.imei,
			rooted: input.test.rooted as any,
			erased: input.test.erased as any,
			grade: input.test.grade as any,
			// Use custom timestamps if provided, otherwise let database use defaults
			...(customTimestamps?.created_at && { created_at: new Date(customTimestamps.created_at) }),
			...(customTimestamps?.updated_at && { updated_at: new Date(customTimestamps.updated_at) }),
		}

		const id = await this.database.insert(test_results).values(toInsertTest as any).$returningId();
		const insertedId = Number(id[0].id)

		const [inserted] = await this.database.select(diagnosticSelection).from(test_results).leftJoin(devices, eq(test_results.device_id, devices.id)).leftJoin(warehousesTable, eq(test_results.warehouse_id, warehousesTable.id)).leftJoin(usersTable, eq(test_results.tester_id, usersTable.id)).where(eq(test_results.id, insertedId))

		return inserted as unknown as DiagnosticPublic | undefined
	}

	async findById(id: number): Promise<DiagnosticPublic | undefined> {
		const [row] = await this.database
			.select(diagnosticSelection)
			.from(test_results)
			.leftJoin(devices, eq(test_results.device_id, devices.id))
			.leftJoin(warehousesTable, eq(test_results.warehouse_id, warehousesTable.id))
			.leftJoin(usersTable, eq(test_results.tester_id, usersTable.id))
			.where(eq(test_results.id, id))
		return row as unknown as DiagnosticPublic | undefined
	}
}


