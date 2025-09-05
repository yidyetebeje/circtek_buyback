import { ensureRole } from './utils/db'

const roles = [
	'super_admin',
	'admin',
	'tester',
	'repair_manager',
	'repair_technician',
	'stock_manager',
]

await Promise.all(roles.map((r) => ensureRole(r)))



