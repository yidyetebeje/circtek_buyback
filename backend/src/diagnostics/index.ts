import Elysia from 'elysia'
import { db } from '../db'
import { DiagnosticsRepository } from './repository'
import { DiagnosticsController } from './controller'
import { DiagnosticListQuery, DiagnosticUploadBody } from './types'
import { requireRole } from '../auth'
import { diagnostics_stats_routes } from './stats'

const repo = new DiagnosticsRepository(db)
const controller = new DiagnosticsController(repo)

export const diagnostic_routes = new Elysia({ prefix: '/diagnostics' })
	// Public report endpoint by id
	.get('/public/tests/:id', async ({ params }) => controller.getPublicReport(Number((params as any).id)), { detail: { tags: ['Diagnostics'], summary: 'Get public test result by id' } })
	// Handle OPTIONS preflight for export endpoint
	.options('/tests/export', () => '', { detail: { tags: ['Diagnostics'], summary: 'CORS preflight for export' } })
	.use(requireRole([]))
	// List test results
	.get('/tests', async (ctx) => {
		const { query, currentTenantId, currentRole } = ctx as any
		return controller.list(query as any, Number(currentTenantId), currentRole)
	}, { query: DiagnosticListQuery, detail: { tags: ['Diagnostics'], summary: 'List test results' } })
	// Export test results as CSV
	.get('/tests/export', async (ctx) => {
		const { query, set, currentTenantId, currentRole } = ctx as any
		const res = await controller.export(query as any, Number(currentTenantId), currentRole)
		// Merge headers to preserve CORS headers set by the middleware
		set.headers = { ...(((set as any).headers) ?? {}), ...res.headers } as any
		set.status = res.status as any
		return res.body
	}, { query: DiagnosticListQuery, detail: { tags: ['Diagnostics'], summary: 'Export test results (CSV)' } })
	// Upload test results from desktop app
	.post('/tests/upload', async (ctx) => {
		const { body, currentUserId, currentTenantId } = ctx as any
		return controller.upload(body as any, Number(currentUserId), Number(currentTenantId))
	}, { body: DiagnosticUploadBody, detail: { tags: ['Diagnostics'], summary: 'Upload test result' } })
	.use(diagnostics_stats_routes)


