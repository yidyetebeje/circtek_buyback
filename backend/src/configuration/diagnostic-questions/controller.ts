import type { response } from '../../types/response'
import { DiagnosticQuestionsRepository } from './repository'
import type {
    QuestionCreateInput,
    QuestionUpdateInput,
    QuestionPublic,
    QuestionOptionCreateInput,
    QuestionOptionUpdateInput,
    QuestionOptionPublic,
    QuestionSetCreateInput,
    QuestionSetUpdateInput,
    QuestionSetPublic,
    QuestionSetAssignmentPublic,
    SubmitAnswerInput,
    AnswerPublic,
    QuestionWithOptions,
    QuestionSetWithQuestions,
    AddQuestionToSetInput,
    TranslationCreateInput,
    TranslationUpdateInput,
    TranslationPublic,
    QuestionTranslations,
    BulkTranslationCreateInput
} from './types'

export class DiagnosticQuestionsController {
    constructor(private readonly repo: DiagnosticQuestionsRepository) {}

    // ==================== QUESTIONS ====================

    async listQuestions(queryTenantId: number | null | undefined, currentRole: string | undefined, currentTenantId: number): Promise<response<QuestionPublic[]>> {
        const hasValidQueryTenant = typeof queryTenantId === 'number' && Number.isFinite(queryTenantId)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? queryTenantId! : null) : currentTenantId
        const rows = await this.repo.listQuestions(resolvedTenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async createQuestion(payload: QuestionCreateInput, tenantId: number): Promise<response<QuestionPublic | null>> {
        const created = await this.repo.createQuestion({ ...payload, tenant_id: tenantId })
        return { data: created ?? null, message: 'Question created', status: 201 }
    }

    async getQuestion(id: number, tenantId: number): Promise<response<QuestionPublic | null>> {
        const found = await this.repo.getQuestion(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async updateQuestion(id: number, payload: QuestionUpdateInput, tenantId: number): Promise<response<QuestionPublic | null>> {
        const updated = await this.repo.updateQuestion(id, payload, tenantId)
        if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: updated, message: 'Updated', status: 200 }
    }

    async deleteQuestion(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const result = await this.repo.deleteQuestion(id, tenantId)
        if (!result.success) {
            const status = result.error?.includes('not found') || result.error?.includes('access denied') ? 404 : 400
            return { data: null, message: result.error || 'Failed to delete', status }
        }
        return { data: { id }, message: 'Question deleted successfully', status: 200 }
    }

    async getQuestionWithOptions(id: number, tenantId: number): Promise<response<QuestionWithOptions | null>> {
        const found = await this.repo.getQuestionWithOptions(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    // ==================== QUESTION OPTIONS ====================

    async listQuestionOptions(questionId: number, tenantId: number): Promise<response<QuestionOptionPublic[]>> {
        // Verify question exists and belongs to tenant
        const question = await this.repo.getQuestion(questionId, tenantId)
        if (!question) return { data: [], message: 'Question not found or forbidden', status: 404 }
        
        const rows = await this.repo.listQuestionOptions(questionId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async createQuestionOption(payload: QuestionOptionCreateInput, tenantId: number): Promise<response<QuestionOptionPublic | null>> {
        // Verify question exists and belongs to tenant
        const question = await this.repo.getQuestion(payload.question_id, tenantId)
        if (!question) return { data: null, message: 'Question not found or forbidden', status: 404 }
        
        const created = await this.repo.createQuestionOption(payload)
        return { data: created ?? null, message: 'Option created', status: 201 }
    }

    async getQuestionOption(id: number, tenantId: number): Promise<response<QuestionOptionPublic | null>> {
        const found = await this.repo.getQuestionOption(id)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        
        // Verify option's question belongs to tenant
        const question = await this.repo.getQuestion(found.question_id, tenantId)
        if (!question) return { data: null, message: 'Forbidden', status: 403 }
        
        return { data: found, message: 'OK', status: 200 }
    }

    async updateQuestionOption(id: number, payload: QuestionOptionUpdateInput, tenantId: number): Promise<response<QuestionOptionPublic | null>> {
        const existing = await this.repo.getQuestionOption(id)
        if (!existing) return { data: null, message: 'Not found', status: 404 }
        
        // Verify option's question belongs to tenant
        const question = await this.repo.getQuestion(existing.question_id, tenantId)
        if (!question) return { data: null, message: 'Forbidden', status: 403 }
        
        const updated = await this.repo.updateQuestionOption(id, payload)
        return { data: updated ?? null, message: 'Updated', status: 200 }
    }

    async deleteQuestionOption(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const existing = await this.repo.getQuestionOption(id)
        if (!existing) return { data: null, message: 'Not found', status: 404 }
        
        // Verify option's question belongs to tenant
        const question = await this.repo.getQuestion(existing.question_id, tenantId)
        if (!question) return { data: null, message: 'Forbidden', status: 403 }
        
        const result = await this.repo.deleteQuestionOption(id)
        if (!result.success) {
            return { data: null, message: result.error || 'Failed to delete', status: 400 }
        }
        return { data: { id }, message: 'Option deleted successfully', status: 200 }
    }

    // ==================== QUESTION SETS ====================

    async listQuestionSets(queryTenantId: number | null | undefined, currentRole: string | undefined, currentTenantId: number): Promise<response<QuestionSetPublic[]>> {
        const hasValidQueryTenant = typeof queryTenantId === 'number' && Number.isFinite(queryTenantId)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? queryTenantId! : null) : currentTenantId
        const rows = await this.repo.listQuestionSets(resolvedTenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async createQuestionSet(payload: QuestionSetCreateInput, tenantId: number): Promise<response<QuestionSetPublic | null>> {
        console.log('=== Controller.createQuestionSet ===')
        console.log('Received payload:', JSON.stringify(payload, null, 2))
        console.log('payload.status type:', typeof payload.status, 'value:', payload.status)
        
        // Ensure status is properly converted to boolean
        const normalizedPayload = {
            ...payload,
            status: payload.status !== undefined ? Boolean(payload.status) : undefined,
            tenant_id: tenantId
        }
        console.log('Normalized payload:', JSON.stringify(normalizedPayload, null, 2))
        console.log('normalizedPayload.status type:', typeof normalizedPayload.status, 'value:', normalizedPayload.status)
        
        const created = await this.repo.createQuestionSet(normalizedPayload)
        return { data: created ?? null, message: 'Question set created', status: 201 }
    }

    async getQuestionSet(id: number, tenantId: number): Promise<response<QuestionSetPublic | null>> {
        const found = await this.repo.getQuestionSet(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async updateQuestionSet(id: number, payload: QuestionSetUpdateInput, tenantId: number): Promise<response<QuestionSetPublic | null>> {
        const updated = await this.repo.updateQuestionSet(id, payload, tenantId)
        if (!updated) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: updated, message: 'Updated', status: 200 }
    }

    async deleteQuestionSet(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const result = await this.repo.deleteQuestionSet(id, tenantId)
        if (!result.success) {
            const status = result.error?.includes('not found') || result.error?.includes('access denied') ? 404 : 400
            return { data: null, message: result.error || 'Failed to delete', status }
        }
        return { data: { id }, message: 'Question set deleted successfully', status: 200 }
    }

    async getQuestionSetWithQuestions(id: number, tenantId: number): Promise<response<QuestionSetWithQuestions | null>> {
        const found = await this.repo.getQuestionSetWithQuestions(id, tenantId)
        if (!found) return { data: null, message: 'Not found', status: 404 }
        return { data: found, message: 'OK', status: 200 }
    }

    async addQuestionToSet(setId: number, payload: AddQuestionToSetInput, tenantId: number): Promise<response<{ success: boolean } | null>> {
        const result = await this.repo.addQuestionToSet(setId, payload, tenantId)
        if (!result.success) {
            const status = result.error?.includes('not found') || result.error?.includes('access denied') ? 404 : 400
            return { data: null, message: result.error || 'Failed to add question', status }
        }
        return { data: { success: true }, message: 'Question added to set', status: 200 }
    }

    async removeQuestionFromSet(setId: number, questionId: number, tenantId: number): Promise<response<{ success: boolean } | null>> {
        const result = await this.repo.removeQuestionFromSet(setId, questionId, tenantId)
        if (!result.success) {
            const status = result.error?.includes('not found') || result.error?.includes('access denied') ? 404 : 400
            return { data: null, message: result.error || 'Failed to remove question', status }
        }
        return { data: { success: true }, message: 'Question removed from set', status: 200 }
    }

    // ==================== ASSIGNMENTS ====================

    async listAssignments(queryTenantId: number | null | undefined, currentRole: string | undefined, currentTenantId: number): Promise<response<QuestionSetAssignmentPublic[]>> {
        const hasValidQueryTenant = typeof queryTenantId === 'number' && Number.isFinite(queryTenantId)
        const resolvedTenantId = currentRole === 'super_admin' ? (hasValidQueryTenant ? queryTenantId! : null) : currentTenantId
        const rows = await this.repo.listAssignments(resolvedTenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async assignQuestionSetToTester(questionSetId: number, testerId: number, tenantId: number): Promise<response<{ success: boolean } | null>> {
        const result = await this.repo.assignQuestionSetToTester(questionSetId, testerId, tenantId)
        if (!result.success) {
            const status = result.error?.includes('not found') || result.error?.includes('access denied') ? 404 : 400
            return { data: null, message: result.error || 'Failed to assign', status }
        }
        return { data: { success: true }, message: 'Question set assigned to tester', status: 200 }
    }

    async unassignQuestionSetFromTester(testerId: number, tenantId: number): Promise<response<{ success: boolean } | null>> {
        const result = await this.repo.unassignQuestionSetFromTester(testerId, tenantId)
        if (!result.success) {
            const status = result.error?.includes('not found') || result.error?.includes('access denied') ? 404 : 400
            return { data: null, message: result.error || 'Failed to unassign', status }
        }
        return { data: { success: true }, message: 'Question set unassigned from tester', status: 200 }
    }

    async getAssignmentsByTester(testerId: number, tenantId: number): Promise<response<QuestionSetAssignmentPublic[]>> {
        const rows = await this.repo.getAssignmentsByTester(testerId, tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async getTestersByQuestionSet(questionSetId: number, tenantId: number): Promise<response<any[]>> {
        const rows = await this.repo.getTestersByQuestionSet(questionSetId, tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    // ==================== ANSWERS ====================

    async submitAnswer(payload: SubmitAnswerInput, answeredBy: number, tenantId: number): Promise<response<{ success: boolean } | null>> {
        const result = await this.repo.submitAnswer(payload, answeredBy, tenantId)
        if (!result.success) {
            return { data: null, message: result.error || 'Failed to submit answer', status: 400 }
        }
        return { data: { success: true }, message: 'Answer submitted', status: 201 }
    }

    async getAnswersByDevice(deviceId: number, tenantId: number): Promise<response<AnswerPublic[]>> {
        const rows = await this.repo.getAnswersByDevice(deviceId, tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    async getAnswersByTestResult(testResultId: number, tenantId: number): Promise<response<AnswerPublic[]>> {
        const rows = await this.repo.getAnswersByTestResult(testResultId, tenantId)
        return { data: rows, message: 'OK', status: 200 }
    }

    // ==================== TRANSLATIONS ====================

    async getQuestionTranslations(questionId: number, tenantId: number): Promise<response<QuestionTranslations>> {
        const translations = await this.repo.getQuestionTranslations(questionId, tenantId)
        return { data: translations, message: 'OK', status: 200 }
    }

    async saveQuestionTranslations(payload: BulkTranslationCreateInput, tenantId: number): Promise<response<{ success: boolean }>> {
        try {
            const { question_id, translations } = payload
            
            // Process each language
            for (const translation of translations) {
                const { language_code, question_text, options } = translation
                
                // Upsert question translation
                await this.repo.upsertTranslation({
                    entity_type: 'question',
                    entity_id: question_id,
                    language_code,
                    translated_text: question_text
                }, tenantId)
                
                // Upsert option translations
                for (const option of options) {
                    await this.repo.upsertTranslation({
                        entity_type: 'option',
                        entity_id: option.option_id,
                        language_code,
                        translated_text: option.option_text
                    }, tenantId)
                }
            }
            
            return { data: { success: true }, message: 'Translations saved', status: 200 }
        } catch (error) {
            console.error('Error saving translations:', error)
            return { data: { success: false }, message: 'Failed to save translations', status: 500 }
        }
    }

    async deleteTranslation(id: number, tenantId: number): Promise<response<{ id: number } | null>> {
        const deleted = await this.repo.deleteTranslation(id, tenantId)
        if (!deleted) return { data: null, message: 'Not found or forbidden', status: 404 }
        return { data: { id }, message: 'Deleted', status: 200 }
    }
}
