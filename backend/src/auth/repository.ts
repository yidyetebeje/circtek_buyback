import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { users, roles } from '../db/circtek.schema'
import { shops, user_shop_access } from '../db/shops.schema'

const userPublicSelection = {
	id: users.id,
	name: users.name,
	user_name: users.user_name,
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
			.where(eq(users.user_name, identifier))
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

	async findShopById(shopId: number) {
		const [shop] = await this.database
			.select({
				id: shops.id,
				name: shops.name,
				tenant_id: shops.tenant_id,
				owner_id: shops.owner_id,
				active: shops.active,
			})
			.from(shops)
			.where(eq(shops.id, shopId))
			.limit(1)
		return shop
	}

	async getUserRoleDetails(roleId: number | null) {
		if (!roleId) return null
		const [role] = await this.database
			.select({
				id: roles.id,
				name: roles.name,
				slug: roles.name, // Assuming name is the slug, adjust if you have a separate slug field
			})
			.from(roles)
			.where(eq(roles.id, roleId))
			.limit(1)
		return role ? { id: role.id, title: role.name, slug: role.slug.toLowerCase().replace(/\s+/g, '_') } : null
	}

	async getUserShopAccess(userId: number, shopId: number) {
		const [access] = await this.database
			.select({
				id: user_shop_access.id,
				can_view: user_shop_access.can_view,
				can_edit: user_shop_access.can_edit,
			})
			.from(user_shop_access)
			.where(and(
				eq(user_shop_access.user_id, userId),
				eq(user_shop_access.shop_id, shopId),
				eq(user_shop_access.can_view, true)
			))
			.limit(1)
		return access
	}
}


