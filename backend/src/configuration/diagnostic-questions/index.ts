import Elysia from 'elysia'
import { db } from '../../db'
import { requireRole } from '../../auth'
import {
    QuestionCreate,
    QuestionUpdate,
    QuestionOptionCreate,
    QuestionOptionUpdate,
    QuestionSetCreate,
    QuestionSetUpdate,
    AddQuestionToSet,
    SubmitAnswer,
    BulkTranslationCreate,
    BulkQuestionSetCreate,
    BulkQuestionSetUpdate
} from './types'
import { DiagnosticQuestionsController } from './controller'
import { DiagnosticQuestionsRepository } from './repository'

const repo = new DiagnosticQuestionsRepository(db)
const controller = new DiagnosticQuestionsController(repo)

export const diagnostic_questions_routes = new Elysia({ prefix: '/diagnostic-questions' })
    .use(requireRole([]))

    // ==================== QUESTIONS ====================
    .get('/questions', async (ctx) => {
        const { currentRole, currentTenantId, query } = ctx as any
        const tenantParam = query?.tenant_id
        const queryTenantId = tenantParam !== undefined ? Number(tenantParam) : undefined
        return controller.listQuestions(queryTenantId, currentRole, Number(currentTenantId))
    }, { detail: { tags: ['Configuration'], summary: 'List diagnostic questions (tenant-scoped)' } })

    .post('/questions', async (ctx) => {
        const { body, currentTenantId, currentRole } = ctx as any
        const tenantId = currentRole === 'super_admin' && body.tenant_id ? Number(body.tenant_id) : Number(currentTenantId)
        const response = await controller.createQuestion(body as any, tenantId)
        ctx.set.status = response.status as any
        return response
    }, { body: QuestionCreate, detail: { tags: ['Configuration'], summary: 'Create diagnostic question' } })

    .get('/questions/:id', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        const response = await controller.getQuestion(Number(params.id), Number(tenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Get diagnostic question by id (tenant-scoped)' } })

    .get('/questions/:id/with-options', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        const response = await controller.getQuestionWithOptions(Number(params.id), Number(tenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Get diagnostic question with options (tenant-scoped)' } })

    .patch('/questions/:id', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        const response = await controller.updateQuestion(Number(params.id), body as any, Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { body: QuestionUpdate, detail: { tags: ['Configuration'], summary: 'Update diagnostic question (tenant-scoped)' } })

    .delete('/questions/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.deleteQuestion(Number(params.id), Number(currentTenantId))
        ctx.set.status = response.status
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Delete diagnostic question (tenant-scoped)' } })

    // ==================== QUESTION OPTIONS ====================
    .get('/questions/:id/options', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.listQuestionOptions(Number(params.id), Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'List options for a question (tenant-scoped)' } })

    .post('/options', async (ctx) => {
        const { body, currentTenantId } = ctx as any
        const response = await controller.createQuestionOption(body as any, Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { body: QuestionOptionCreate, detail: { tags: ['Configuration'], summary: 'Create question option' } })

    .get('/options/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.getQuestionOption(Number(params.id), Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Get question option by id (tenant-scoped)' } })

    .patch('/options/:id', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        const response = await controller.updateQuestionOption(Number(params.id), body as any, Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { body: QuestionOptionUpdate, detail: { tags: ['Configuration'], summary: 'Update question option (tenant-scoped)' } })

    .delete('/options/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.deleteQuestionOption(Number(params.id), Number(currentTenantId))
        ctx.set.status = response.status
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Delete question option (tenant-scoped)' } })

    // ==================== QUESTION SETS ====================
    .get('/sets', async (ctx) => {
        const { currentRole, currentTenantId, query } = ctx as any
        const tenantParam = query?.tenant_id
        const queryTenantId = tenantParam !== undefined ? Number(tenantParam) : undefined
        return controller.listQuestionSets(queryTenantId, currentRole, Number(currentTenantId))
    }, { detail: { tags: ['Configuration'], summary: 'List diagnostic question sets (tenant-scoped)' } })

    .post('/sets', async (ctx) => {
        const { body, currentTenantId, currentRole } = ctx as any
        console.log('=== POST /sets - Route Handler ===')
        console.log('Raw body:', JSON.stringify(body, null, 2))
        console.log('body.status type:', typeof body.status, 'value:', body.status)
        const tenantId = currentRole === 'super_admin' && body.tenant_id ? Number(body.tenant_id) : Number(currentTenantId)
        console.log('Resolved tenantId:', tenantId)
        const response = await controller.createQuestionSet(body as any, tenantId)
        ctx.set.status = response.status as any
        return response
    }, { body: QuestionSetCreate, detail: { tags: ['Configuration'], summary: 'Create diagnostic question set' } })

    .post('/sets/bulk', async (ctx) => {
        const { body, currentTenantId, currentRole } = ctx as any
        const tenantId = currentRole === 'super_admin' && body.tenant_id ? Number(body.tenant_id) : Number(currentTenantId)
        const response = await controller.bulkCreateQuestionSet(body as any, tenantId)
        ctx.set.status = response.status as any
        return response
    }, { body: BulkQuestionSetCreate, detail: { tags: ['Configuration'], summary: 'Create diagnostic question set with questions, options, and translations in one call' } })

    .get('/sets/:id', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        const response = await controller.getQuestionSet(Number(params.id), Number(tenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Get diagnostic question set by id (tenant-scoped)' } })

    .get('/sets/:id/with-questions', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const queryTenantId = query?.tenant_id ? Number(query.tenant_id) : undefined
        const response = await controller.getQuestionSetWithQuestions(Number(params.id), queryTenantId, currentRole, currentTenantId)
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Get diagnostic question set with questions (tenant-scoped)' } })

    .patch('/sets/:id', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        const response = await controller.updateQuestionSet(Number(params.id), body as any, Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { body: QuestionSetUpdate, detail: { tags: ['Configuration'], summary: 'Update diagnostic question set (tenant-scoped)' } })

    .patch('/sets/:id/bulk', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        const response = await controller.bulkUpdateQuestionSet(Number(params.id), body as any, Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { body: BulkQuestionSetUpdate, detail: { tags: ['Configuration'], summary: 'Update diagnostic question set with questions, options, and translations in one call (tenant-scoped)' } })

    .delete('/sets/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.deleteQuestionSet(Number(params.id), Number(currentTenantId))
        ctx.set.status = response.status
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Delete diagnostic question set (tenant-scoped)' } })

    .post('/sets/:id/questions', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        const response = await controller.addQuestionToSet(Number(params.id), body as any, Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { body: AddQuestionToSet, detail: { tags: ['Configuration'], summary: 'Add question to set (tenant-scoped)' } })

    .delete('/sets/:id/questions/:questionId', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.removeQuestionFromSet(Number(params.id), Number(params.questionId), Number(currentTenantId))
        ctx.set.status = response.status
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Remove question from set (tenant-scoped)' } })

    // ==================== ASSIGNMENTS ====================
    .get('/assignments', async (ctx) => {
        const { currentRole, currentTenantId, query } = ctx as any
        const tenantParam = query?.tenant_id
        const queryTenantId = tenantParam !== undefined ? Number(tenantParam) : undefined
        return controller.listAssignments(queryTenantId, currentRole, Number(currentTenantId))
    }, { detail: { tags: ['Configuration'], summary: 'List diagnostic question set assignments (tenant-scoped)' } })

    .post('/assignments', async (ctx) => {
        const { body, currentTenantId } = ctx as any
        const response = await controller.assignQuestionSetToTester(
            Number(body.question_set_id),
            Number(body.tester_id),
            Number(currentTenantId)
        )
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Assign question set to tester (tenant-guarded)' } })

    .delete('/assignments/:testerId', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.unassignQuestionSetFromTester(Number(params.testerId), Number(currentTenantId))
        ctx.set.status = response.status
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Unassign question set from tester (tenant-scoped)' } })

    .get('/assignments/tester/:testerId', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        const response = await controller.getAssignmentsByTester(Number(params.testerId), Number(tenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Get assignments for a tester (tenant-scoped)' } })

    .get('/sets/:id/testers', async (ctx) => {
        const { params, currentTenantId, currentRole, query } = ctx as any
        const tenantId = currentRole === 'super_admin' ? (query?.tenant_id ?? currentTenantId) : currentTenantId
        const response = await controller.getTestersByQuestionSet(Number(params.id), Number(tenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Get testers assigned to a question set (tenant-scoped)' } })

    // ==================== ANSWERS ====================
    .post('/answers', async (ctx) => {
        const { body, currentTenantId, currentUserId } = ctx as any
        const response = await controller.submitAnswer(body as any, Number(currentUserId), Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { body: SubmitAnswer, detail: { tags: ['Diagnostics'], summary: 'Submit answer to diagnostic question' } })

    .get('/answers/device/:deviceId', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.getAnswersByDevice(Number(params.deviceId), Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Diagnostics'], summary: 'Get answers for a device (tenant-scoped)' } })

    .get('/answers/test-result/:testResultId', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.getAnswersByTestResult(Number(params.testResultId), Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Diagnostics'], summary: 'Get answers for a test result (tenant-scoped)' } })

    // ==================== TRANSLATIONS ====================
    .get('/questions/:id/translations', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.getQuestionTranslations(Number(params.id), Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Get translations for a question and its options (tenant-scoped)' } })

    .post('/questions/:id/translations', async (ctx) => {
        const { params, body, currentTenantId } = ctx as any
        const payload = { ...body, question_id: Number(params.id) }
        const response = await controller.saveQuestionTranslations(payload as any, Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { body: BulkTranslationCreate, detail: { tags: ['Configuration'], summary: 'Save translations for a question and its options (tenant-scoped)' } })

    .delete('/translations/:id', async (ctx) => {
        const { params, currentTenantId } = ctx as any
        const response = await controller.deleteTranslation(Number(params.id), Number(currentTenantId))
        ctx.set.status = response.status as any
        return response
    }, { detail: { tags: ['Configuration'], summary: 'Delete a translation (tenant-scoped)' } })
