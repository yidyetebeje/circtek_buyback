import { eq, or } from 'drizzle-orm'
import { db } from '../db'
import { users, roles } from '../db/circtek.schema'

const userPublicSelection = {
	id: users.id,
	name: users.name,
	user_name: users.user_name,
	email: users.email,
	created_at: users.created_at,
	status: users.status,
	role_id: users.role_id,
	tenant_id: users.tenant_id,
    warehouse_id: users.warehouse_id,
	managed_shop_id: users.managed_shop_id
}

export class AuthRepository {
	constructor(private readonly database: typeof db) {}

	async findUserByIdentifier(identifier: string) {
		const [row] = await this.database
			.select({
				...userPublicSelection,
				password: users.password,
			})
			.from(users)
			.where(or(eq(users.user_name, identifier), eq(users.email, identifier)))
			.limit(1)
		return row
	}

	async findUserPublicById(id: number) {
		const [row] = await this.database.select(userPublicSelection).from(users).where(eq(users.id, id))
		return row
	}

	async getRoleName(roleId: number | null) {
		if (!roleId) return null
		const [r] = await this.database.select({ name: roles.name }).from(roles).where(eq(roles.id, roleId))
		return r?.name ?? null
	}
}


