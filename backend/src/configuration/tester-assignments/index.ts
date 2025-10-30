import Elysia from 'elysia'
import { db } from '../../db'
import { requireRole } from '../../auth'
import { TesterAssignmentsRepository } from './repository'
import { TesterAssignmentsController } from './controller'

const testerAssignmentsRepo = new TesterAssignmentsRepository(db)
const testerAssignmentsController = new TesterAssignmentsController(testerAssignmentsRepo)

export const tester_assignments_routes = new Elysia({ prefix: '/tester-assignments' })
    .use(requireRole([]))
    .get('/:testerId', async (ctx) => {
        
        const { params, currentTenantId, currentRole, query } = ctx as any
        console.log(params.testerId, "testerId")
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        console.log(tenantId, "tenantId")
        return testerAssignmentsController.getAllAssignments(Number(params.testerId), Number(tenantId))
    }, { detail: { tags: ['Configuration'], summary: 'Get all assignments for a tester (tenant-scoped)' } })

export { testerAssignmentsController }
