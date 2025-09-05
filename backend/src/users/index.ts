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
		const { query, currentRole, currentTenantId } = ctx as any
		const tenantScoped = currentRole === 'super_admin' ? undefined : currentTenantId
		return controller.list({ ...(query as any), tenant_id: tenantScoped } as any)
	}, { query: UserListQuery, detail: { tags: ['Users'], summary: 'List users' } })
	.get('/:id', async (ctx) => {
		const { params, currentRole, currentTenantId } = ctx as any
		return controller.getOne(Number(params.id), currentRole === 'super_admin' ? undefined : (currentTenantId as number))
	}, { detail: { tags: ['Users'], summary: 'Get user by id' } })
	.post('/', async ({ body }) => {
		return controller.create(body as any);
	}, { body: UserCreate, detail: { tags: ['Users'], summary: 'Create user' } })
	.patch('/:id', async (ctx) => {
		const { params, body, currentRole, currentTenantId } = ctx as any
		return controller.update(
			Number(params.id),
			body as any,
			currentRole === 'super_admin' ? undefined : (currentTenantId as number)
		)
	}, { body: UserUpdate, detail: { tags: ['Users'], summary: 'Update user' } })
	.delete('/:id', async ({ params }) => {
		return controller.remove(Number(params.id));
	}, { detail: { tags: ['Users'], summary: 'Delete user' } });