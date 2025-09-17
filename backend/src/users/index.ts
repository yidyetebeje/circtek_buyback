import Elysia from "elysia";
import { UsersRepository } from "./repository";
import { db } from "../db";
import { UsersController } from "./controller";
import { UserCreate, UserListQuery, UserUpdate } from "./types";
import { requireRole } from "../auth";

const repo = new UsersRepository(db);
const controller = new UsersController(repo);

export const user_routes = new Elysia({ prefix: '/users' })
	.use(requireRole([]))
	.get('/', async (ctx) => {
		const { query, currentRole, currentTenantId, set } = ctx as any
		// For super_admin, allow filtering by tenant_id from query params, otherwise use their tenant_id
		const tenantScoped = currentRole === 'super_admin' 
			? (query as any).tenant_id 
			: currentTenantId
		const result = await controller.list({ ...(query as any), tenant_id: tenantScoped } as any)
		set.status = result.status
		return result
	}, { query: UserListQuery, detail: { tags: ['Users'], summary: 'List users' } })
	.get('/:id', async (ctx) => {
		const { params, currentRole, currentTenantId, set } = ctx as any
		const result = await controller.getOne(Number(params.id), currentRole === 'super_admin' ? undefined : (currentTenantId as number))
		set.status = result.status
		return result
	}, { detail: { tags: ['Users'], summary: 'Get user by id' } })
	.post('/', async ({ body, set }) => {
		const result = await controller.create(body as any);
		set.status = result.status;
		return result;
	}, { body: UserCreate, detail: { tags: ['Users'], summary: 'Create user' } })
	.patch('/:id', async (ctx) => {
		const { params, body, currentRole, currentTenantId, set } = ctx as any
		const result = await controller.update(
			Number(params.id),
			body as any,
			currentRole === 'super_admin' ? undefined : (currentTenantId as number)
		)
		set.status = result.status
		return result
	}, { body: UserUpdate, detail: { tags: ['Users'], summary: 'Update user' } })
	.delete('/:id', async ({ params, set }) => {
		const result = await controller.remove(Number(params.id));
		set.status = result.status;
		return result;
	}, { detail: { tags: ['Users'], summary: 'Delete user' } });
