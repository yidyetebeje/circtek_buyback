import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../../db'
import {
    diagnostic_questions,
    diagnostic_question_options,
    diagnostic_question_sets,
    diagnostic_question_set_questions,
    diagnostic_question_answers,
    diagnostic_translations,
    tenants,
    users
} from '../../db/circtek.schema'
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
    QuestionTranslations
} from './types'

export class DiagnosticQuestionsRepository {
    constructor(private readonly database: typeof db) {}

    // ==================== QUESTIONS ====================

    async listQuestions(tenantId?: number | null): Promise<QuestionPublic[]> {
        const query = this.database
            .select({
                id: diagnostic_questions.id,
                question_text: diagnostic_questions.question_text,
                description: diagnostic_questions.description,
                status: diagnostic_questions.status,
                models: diagnostic_questions.models,
                tenant_id: diagnostic_questions.tenant_id,
                tenant_name: tenants.name,
                created_at: diagnostic_questions.created_at,
                updated_at: diagnostic_questions.updated_at,
            })
            .from(diagnostic_questions)
            .leftJoin(tenants, eq(diagnostic_questions.tenant_id, tenants.id))
            .orderBy(desc(diagnostic_questions.updated_at))

        if (tenantId != null) {
            query.where(eq(diagnostic_questions.tenant_id, tenantId))
        }

        const rows = await query
        return rows as any
    }

    async createQuestion(payload: QuestionCreateInput & { tenant_id: number }): Promise<QuestionPublic | undefined> {
        // Convert boolean to 0/1 for MySQL TINYINT compatibility
        const statusValue = payload.status !== undefined ? (payload.status ? 1 : 0) : 1;
        
        const insertData = {
            question_text: payload.question_text,
            description: payload.description,
            status: statusValue,
            models: payload.models ?? null,
            tenant_id: payload.tenant_id,
        }
        await this.database.insert(diagnostic_questions).values(insertData as any)
        const [created] = await this.database
            .select({
                id: diagnostic_questions.id,
                question_text: diagnostic_questions.question_text,
                description: diagnostic_questions.description,
                status: diagnostic_questions.status,
                models: diagnostic_questions.models,
                tenant_id: diagnostic_questions.tenant_id,
                tenant_name: tenants.name,
                created_at: diagnostic_questions.created_at,
                updated_at: diagnostic_questions.updated_at,
            })
            .from(diagnostic_questions)
            .leftJoin(tenants, eq(diagnostic_questions.tenant_id, tenants.id))
            .where(eq(diagnostic_questions.tenant_id, payload.tenant_id))
            .orderBy(desc(diagnostic_questions.id))
            .limit(1)
        return created as any
    }

    async getQuestion(id: number, tenantId: number): Promise<QuestionPublic | undefined> {
        const [row] = await this.database
            .select({
                id: diagnostic_questions.id,
                question_text: diagnostic_questions.question_text,
                description: diagnostic_questions.description,
                status: diagnostic_questions.status,
                models: diagnostic_questions.models,
                tenant_id: diagnostic_questions.tenant_id,
                tenant_name: tenants.name,
                created_at: diagnostic_questions.created_at,
                updated_at: diagnostic_questions.updated_at,
            })
            .from(diagnostic_questions)
            .leftJoin(tenants, eq(diagnostic_questions.tenant_id, tenants.id))
            .where(and(eq(diagnostic_questions.id, id), eq(diagnostic_questions.tenant_id, tenantId)) as any)
        return row as any
    }

    async updateQuestion(id: number, payload: QuestionUpdateInput, tenantId: number): Promise<QuestionPublic | undefined> {
        await this.database
            .update(diagnostic_questions)
            .set(payload as any)
            .where(and(eq(diagnostic_questions.id, id), eq(diagnostic_questions.tenant_id, tenantId)) as any)
        return this.getQuestion(id, tenantId)
    }

    async deleteQuestion(id: number, tenantId: number): Promise<{ success: boolean; error?: string }> {
        const [existing] = await this.database
            .select({ id: diagnostic_questions.id })
            .from(diagnostic_questions)
            .where(and(eq(diagnostic_questions.id, id), eq(diagnostic_questions.tenant_id, tenantId)) as any)
        
        if (!existing) return { success: false, error: 'Question not found or access denied' }

        // Check if question is part of any sets
        const [inSet] = await this.database
            .select({ id: diagnostic_question_set_questions.id })
            .from(diagnostic_question_set_questions)
            .where(eq(diagnostic_question_set_questions.question_id, id))
            .limit(1)

        if (inSet) {
            return { 
                success: false, 
                error: 'Cannot delete question. It is currently part of one or more question sets. Please remove it from all sets first.' 
            }
        }

        try {
            // Delete options first
            await this.database
                .delete(diagnostic_question_options)
                .where(eq(diagnostic_question_options.question_id, id))
            
            // Delete question
            await this.database
                .delete(diagnostic_questions)
                .where(eq(diagnostic_questions.id, id))
            
            return { success: true }
        } catch (error: any) {
            console.error('Failed to delete question:', error)
            return { success: false, error: 'Failed to delete question' }
        }
    }

    // ==================== QUESTION OPTIONS ====================

    async listQuestionOptions(questionId: number): Promise<QuestionOptionPublic[]> {
        const rows = await this.database
            .select()
            .from(diagnostic_question_options)
            .where(eq(diagnostic_question_options.question_id, questionId))
            .orderBy(diagnostic_question_options.display_order, diagnostic_question_options.id)
        return rows as any
    }

    async createQuestionOption(payload: QuestionOptionCreateInput): Promise<QuestionOptionPublic | undefined> {
        // Convert boolean to 0/1 for MySQL TINYINT compatibility
        const statusValue = payload.status !== undefined ? (payload.status ? 1 : 0) : 1;
        
        const insertData = {
            question_id: payload.question_id,
            option_text: payload.option_text,
            message: payload.message ?? null,
            display_order: payload.display_order ?? 0,
            status: statusValue,
        }
        await this.database.insert(diagnostic_question_options).values(insertData as any)
        const [created] = await this.database
            .select()
            .from(diagnostic_question_options)
            .where(eq(diagnostic_question_options.question_id, payload.question_id))
            .orderBy(desc(diagnostic_question_options.id))
            .limit(1)
        return created as any
    }

    async getQuestionOption(id: number): Promise<QuestionOptionPublic | undefined> {
        const [row] = await this.database
            .select()
            .from(diagnostic_question_options)
            .where(eq(diagnostic_question_options.id, id))
        return row as any
    }

    async updateQuestionOption(id: number, payload: QuestionOptionUpdateInput): Promise<QuestionOptionPublic | undefined> {
        await this.database
            .update(diagnostic_question_options)
            .set(payload as any)
            .where(eq(diagnostic_question_options.id, id))
        return this.getQuestionOption(id)
    }

    async deleteQuestionOption(id: number): Promise<{ success: boolean; error?: string }> {
        const [existing] = await this.database
            .select({ id: diagnostic_question_options.id })
            .from(diagnostic_question_options)
            .where(eq(diagnostic_question_options.id, id))
        
        if (!existing) return { success: false, error: 'Option not found' }

        try {
            await this.database
                .delete(diagnostic_question_options)
                .where(eq(diagnostic_question_options.id, id))
            return { success: true }
        } catch (error: any) {
            console.error('Failed to delete option:', error)
            return { success: false, error: 'Failed to delete option' }
        }
    }

    async getQuestionWithOptions(questionId: number, tenantId: number): Promise<QuestionWithOptions | null> {
        const question = await this.getQuestion(questionId, tenantId)
        if (!question) return null
        
        const options = await this.listQuestionOptions(questionId)
        return { ...question, options } as QuestionWithOptions
    }

    // ==================== QUESTION SETS ====================

    async listQuestionSets(tenantId?: number | null): Promise<QuestionSetPublic[]> {
        const query = this.database
            .select({
                id: diagnostic_question_sets.id,
                title: diagnostic_question_sets.title,
                description: diagnostic_question_sets.description,
                status: diagnostic_question_sets.status,
                tenant_id: diagnostic_question_sets.tenant_id,
                tenant_name: tenants.name,
                created_at: diagnostic_question_sets.created_at,
                updated_at: diagnostic_question_sets.updated_at,
            })
            .from(diagnostic_question_sets)
            .leftJoin(tenants, eq(diagnostic_question_sets.tenant_id, tenants.id))
            .orderBy(desc(diagnostic_question_sets.updated_at))

        if (tenantId != null) {
            query.where(eq(diagnostic_question_sets.tenant_id, tenantId))
        }

        const rows = await query
        return rows as any
    }

    async createQuestionSet(payload: QuestionSetCreateInput & { tenant_id: number }): Promise<QuestionSetPublic | undefined> {
        console.log('=== Repository.createQuestionSet ===')
        console.log('Received payload:', JSON.stringify(payload, null, 2))
        console.log('payload.status type:', typeof payload.status, 'value:', payload.status)
        
        // Convert boolean to 0/1 for MySQL TINYINT compatibility
        const statusValue = payload.status !== undefined ? (payload.status ? 1 : 0) : 1;
        
        const insertData = {
            title: payload.title,
            description: payload.description,
            status: statusValue,
            tenant_id: payload.tenant_id,
        }
        console.log('Final insertData:', JSON.stringify(insertData, null, 2))
        console.log('insertData.status type:', typeof insertData.status, 'value:', insertData.status)
        console.log('About to call database.insert()...')
        
        try {
            await this.database.insert(diagnostic_question_sets).values(insertData as any)
            console.log('Database insert successful!')
        } catch (error) {
            console.error('Database insert failed:', error)
            throw error
        }
        const [created] = await this.database
            .select({
                id: diagnostic_question_sets.id,
                title: diagnostic_question_sets.title,
                description: diagnostic_question_sets.description,
                status: diagnostic_question_sets.status,
                tenant_id: diagnostic_question_sets.tenant_id,
                tenant_name: tenants.name,
                created_at: diagnostic_question_sets.created_at,
                updated_at: diagnostic_question_sets.updated_at,
            })
            .from(diagnostic_question_sets)
            .leftJoin(tenants, eq(diagnostic_question_sets.tenant_id, tenants.id))
            .where(eq(diagnostic_question_sets.tenant_id, payload.tenant_id))
            .orderBy(desc(diagnostic_question_sets.id))
            .limit(1)
        return created as any
    }

    async getQuestionSet(id: number, tenantId: number): Promise<QuestionSetPublic | undefined> {
        const [row] = await this.database
            .select({
                id: diagnostic_question_sets.id,
                title: diagnostic_question_sets.title,
                description: diagnostic_question_sets.description,
                status: diagnostic_question_sets.status,
                tenant_id: diagnostic_question_sets.tenant_id,
                tenant_name: tenants.name,
                created_at: diagnostic_question_sets.created_at,
                updated_at: diagnostic_question_sets.updated_at,
            })
            .from(diagnostic_question_sets)
            .leftJoin(tenants, eq(diagnostic_question_sets.tenant_id, tenants.id))
            .where(and(eq(diagnostic_question_sets.id, id), eq(diagnostic_question_sets.tenant_id, tenantId)) as any)
        return row as any
    }

    async updateQuestionSet(id: number, payload: QuestionSetUpdateInput, tenantId: number): Promise<QuestionSetPublic | undefined> {
        await this.database
            .update(diagnostic_question_sets)
            .set(payload as any)
            .where(and(eq(diagnostic_question_sets.id, id), eq(diagnostic_question_sets.tenant_id, tenantId)) as any)
        return this.getQuestionSet(id, tenantId)
    }

    async deleteQuestionSet(id: number, tenantId: number): Promise<{ success: boolean; error?: string }> {
        const [existing] = await this.database
            .select({ id: diagnostic_question_sets.id })
            .from(diagnostic_question_sets)
            .where(and(eq(diagnostic_question_sets.id, id), eq(diagnostic_question_sets.tenant_id, tenantId)) as any)
        
        if (!existing) return { success: false, error: 'Question set not found or access denied' }

        // Check if any users are assigned to this question set
        const [hasAssignment] = await this.database
            .select({ id: users.id })
            .from(users)
            .where(eq(users.diagnostic_question_set_id, id))
            .limit(1)

        if (hasAssignment) {
            return { 
                success: false, 
                error: 'Cannot delete question set. It is currently assigned to one or more users. Please unassign all users first.' 
            }
        }

        try {
            // Delete set-question relationships
            await this.database
                .delete(diagnostic_question_set_questions)
                .where(eq(diagnostic_question_set_questions.question_set_id, id))
            
            // Delete set
            await this.database
                .delete(diagnostic_question_sets)
                .where(eq(diagnostic_question_sets.id, id))
            
            return { success: true }
        } catch (error: any) {
            console.error('Failed to delete question set:', error)
            return { success: false, error: 'Failed to delete question set' }
        }
    }

    async addQuestionToSet(setId: number, payload: AddQuestionToSetInput, tenantId: number): Promise<{ success: boolean; error?: string }> {
        // Verify set exists and belongs to tenant
        const set = await this.getQuestionSet(setId, tenantId)
        if (!set) return { success: false, error: 'Question set not found or access denied' }

        // Verify question exists and belongs to tenant
        const question = await this.getQuestion(payload.question_id, tenantId)
        if (!question) return { success: false, error: 'Question not found or access denied' }

        try {
            await this.database.insert(diagnostic_question_set_questions).values({
                question_set_id: setId,
                question_id: payload.question_id,
                display_order: payload.display_order ?? 0,
            } as any)
            return { success: true }
        } catch (error: any) {
            if (error.message?.includes('Duplicate')) {
                return { success: false, error: 'Question is already in this set' }
            }
            console.error('Failed to add question to set:', error)
            return { success: false, error: 'Failed to add question to set' }
        }
    }

    async removeQuestionFromSet(setId: number, questionId: number, tenantId: number): Promise<{ success: boolean; error?: string }> {
        // Verify set exists and belongs to tenant
        const set = await this.getQuestionSet(setId, tenantId)
        if (!set) return { success: false, error: 'Question set not found or access denied' }

        try {
            await this.database
                .delete(diagnostic_question_set_questions)
                .where(
                    and(
                        eq(diagnostic_question_set_questions.question_set_id, setId),
                        eq(diagnostic_question_set_questions.question_id, questionId)
                    ) as any
                )
            return { success: true }
        } catch (error: any) {
            console.error('Failed to remove question from set:', error)
            return { success: false, error: 'Failed to remove question from set' }
        }
    }

    async getQuestionSetWithQuestions(setId: number, tenantId: number): Promise<QuestionSetWithQuestions | null> {
        const set = await this.getQuestionSet(setId, tenantId)
        if (!set) return null

        const setQuestions = await this.database
            .select({
                question_id: diagnostic_question_set_questions.question_id,
                display_order: diagnostic_question_set_questions.display_order,
            })
            .from(diagnostic_question_set_questions)
            .where(eq(diagnostic_question_set_questions.question_set_id, setId))
            .orderBy(diagnostic_question_set_questions.display_order, diagnostic_question_set_questions.question_id)

        const questions: QuestionWithOptions[] = []
        for (const sq of setQuestions) {
            const question = await this.getQuestionWithOptions(sq.question_id, tenantId)
            if (question) {
                questions.push(question)
            }
        }

        return { ...set, questions } as QuestionSetWithQuestions
    }

    // ==================== ASSIGNMENTS ====================

    async listAssignments(tenantId?: number | null): Promise<QuestionSetAssignmentPublic[]> {
        const baseQuery = this.database
            .select({
                id: users.id,
                question_set_id: users.diagnostic_question_set_id,
                question_set_title: diagnostic_question_sets.title,
                tester_id: users.id,
                tester_name: users.name,
                status: sql<string>`'active'`.as('status'),
                tenant_id: users.tenant_id,
                created_at: users.created_at,
                updated_at: users.updated_at,
            })
            .from(users)
            .leftJoin(diagnostic_question_sets, eq(users.diagnostic_question_set_id, diagnostic_question_sets.id))
            .$dynamic()

        if (tenantId != null) {
            const rows = await baseQuery
                .where(
                    and(
                        sql`${users.diagnostic_question_set_id} IS NOT NULL`,
                        eq(users.tenant_id, tenantId)
                    ) as any
                )
                .orderBy(desc(users.updated_at))
            return rows as any
        } else {
            const rows = await baseQuery
                .where(sql`${users.diagnostic_question_set_id} IS NOT NULL`)
                .orderBy(desc(users.updated_at))
            return rows as any
        }
    }

    async assignQuestionSetToTester(questionSetId: number, testerId: number, tenantId: number): Promise<{ success: boolean; error?: string }> {
        // Verify question set exists
        const set = await this.getQuestionSet(questionSetId, tenantId)
        if (!set) return { success: false, error: 'Question set not found or access denied' }

        // Verify tester exists and belongs to tenant
        const [tester] = await this.database
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.id, testerId), eq(users.tenant_id, tenantId)) as any)
        
        if (!tester) return { success: false, error: 'Tester not found or access denied' }

        try {
            await this.database
                .update(users)
                .set({ diagnostic_question_set_id: questionSetId } as any)
                .where(eq(users.id, testerId))
            return { success: true }
        } catch (error: any) {
            console.error('Failed to assign question set:', error)
            return { success: false, error: 'Failed to assign question set' }
        }
    }

    async unassignQuestionSetFromTester(testerId: number, tenantId: number): Promise<{ success: boolean; error?: string }> {
        const [existing] = await this.database
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.id, testerId), eq(users.tenant_id, tenantId)) as any)
        
        if (!existing) return { success: false, error: 'User not found or access denied' }

        try {
            await this.database
                .update(users)
                .set({ diagnostic_question_set_id: null } as any)
                .where(eq(users.id, testerId))
            return { success: true }
        } catch (error: any) {
            console.error('Failed to unassign question set:', error)
            return { success: false, error: 'Failed to unassign question set' }
        }
    }

    async getAssignmentsByTester(testerId: number, tenantId: number): Promise<QuestionSetAssignmentPublic[]> {
        const rows = await this.database
            .select({
                id: users.id,
                question_set_id: users.diagnostic_question_set_id,
                question_set_title: diagnostic_question_sets.title,
                tester_id: users.id,
                tester_name: users.name,
                status: sql<string>`'active'`.as('status'),
                tenant_id: users.tenant_id,
                created_at: users.created_at,
                updated_at: users.updated_at,
            })
            .from(users)
            .leftJoin(diagnostic_question_sets, eq(users.diagnostic_question_set_id, diagnostic_question_sets.id))
            .where(
                and(
                    eq(users.id, testerId),
                    eq(users.tenant_id, tenantId),
                    sql`${users.diagnostic_question_set_id} IS NOT NULL`
                ) as any
            )
            .orderBy(desc(users.updated_at))
        
        return rows as any
    }

    async getTestersByQuestionSet(questionSetId: number, tenantId: number): Promise<any[]> {
        const rows = await this.database
            .select({
                id: users.id,
                user_name: users.user_name,
                name: users.name,
                status: users.status,
                tenant_id: users.tenant_id,
            })
            .from(users)
            .where(
                and(
                    eq(users.diagnostic_question_set_id, questionSetId),
                    eq(users.tenant_id, tenantId)
                ) as any
            )
            .orderBy(users.name)
        
        return rows as any
    }

    // ==================== ANSWERS ====================

    async submitAnswer(payload: SubmitAnswerInput, answeredBy: number, tenantId: number): Promise<{ success: boolean; error?: string }> {
        // Verify user exists
        const [user] = await this.database
            .select({ id: users.id })
            .from(users)
            .where(
                and(
                    eq(users.id, answeredBy),
                    eq(users.tenant_id, tenantId)
                ) as any
            )
        
        if (!user) {
            return { success: false, error: 'User not found' }
        }

        try {
            await this.database.insert(diagnostic_question_answers).values({
                question_text: payload.question_text,
                answer_text: payload.answer_text,
                device_id: payload.device_id,
                test_result_id: payload.test_result_id,
                answered_by: answeredBy,
                tenant_id: tenantId,
            } as any)
            return { success: true }
        } catch (error: any) {
            console.error('Failed to submit answer:', error)
            return { success: false, error: 'Failed to submit answer' }
        }
    }

    async getAnswersByDevice(deviceId: number, tenantId: number): Promise<AnswerPublic[]> {
        const rows = await this.database
            .select({
                id: diagnostic_question_answers.id,
                question_text: diagnostic_question_answers.question_text,
                answer_text: diagnostic_question_answers.answer_text,
                device_id: diagnostic_question_answers.device_id,
                test_result_id: diagnostic_question_answers.test_result_id,
                answered_by: diagnostic_question_answers.answered_by,
                answered_by_name: users.name,
                tenant_id: diagnostic_question_answers.tenant_id,
                created_at: diagnostic_question_answers.created_at,
            })
            .from(diagnostic_question_answers)
            .leftJoin(users, eq(diagnostic_question_answers.answered_by, users.id))
            .where(
                and(
                    eq(diagnostic_question_answers.device_id, deviceId),
                    eq(diagnostic_question_answers.tenant_id, tenantId)
                ) as any
            )
            .orderBy(desc(diagnostic_question_answers.created_at))
        
        return rows as any
    }

    async getAnswersByTestResult(testResultId: number, tenantId: number): Promise<AnswerPublic[]> {
        const rows = await this.database
            .select({
                id: diagnostic_question_answers.id,
                question_text: diagnostic_question_answers.question_text,
                answer_text: diagnostic_question_answers.answer_text,
                device_id: diagnostic_question_answers.device_id,
                test_result_id: diagnostic_question_answers.test_result_id,
                answered_by: diagnostic_question_answers.answered_by,
                answered_by_name: users.name,
                tenant_id: diagnostic_question_answers.tenant_id,
                created_at: diagnostic_question_answers.created_at,
            })
            .from(diagnostic_question_answers)
            .leftJoin(users, eq(diagnostic_question_answers.answered_by, users.id))
            .where(
                and(
                    eq(diagnostic_question_answers.test_result_id, testResultId),
                    eq(diagnostic_question_answers.tenant_id, tenantId)
                ) as any
            )
            .orderBy(desc(diagnostic_question_answers.created_at))
        
        return rows as any
    }

    // ==================== TRANSLATIONS ====================

    async createTranslation(payload: TranslationCreateInput, tenantId: number): Promise<TranslationPublic | undefined> {
        const insertData = {
            entity_type: payload.entity_type,
            entity_id: payload.entity_id,
            language_code: payload.language_code,
            translated_text: payload.translated_text,
            tenant_id: tenantId,
        }
        
        await this.database.insert(diagnostic_translations).values(insertData as any)
        
        const [created] = await this.database
            .select({
                id: diagnostic_translations.id,
                entity_type: diagnostic_translations.entity_type,
                entity_id: diagnostic_translations.entity_id,
                language_code: diagnostic_translations.language_code,
                translated_text: diagnostic_translations.translated_text,
                tenant_id: diagnostic_translations.tenant_id,
                created_at: diagnostic_translations.created_at,
                updated_at: diagnostic_translations.updated_at,
            })
            .from(diagnostic_translations)
            .where(
                and(
                    eq(diagnostic_translations.tenant_id, tenantId),
                    eq(diagnostic_translations.entity_type, payload.entity_type),
                    eq(diagnostic_translations.entity_id, payload.entity_id),
                    eq(diagnostic_translations.language_code, payload.language_code)
                ) as any
            )
            .limit(1)
        
        return created as any
    }

    async updateTranslation(id: number, payload: TranslationUpdateInput, tenantId: number): Promise<boolean> {
        const result = await this.database
            .update(diagnostic_translations)
            .set({
                translated_text: payload.translated_text,
                updated_at: sql`CURRENT_TIMESTAMP`,
            })
            .where(
                and(
                    eq(diagnostic_translations.id, id),
                    eq(diagnostic_translations.tenant_id, tenantId)
                ) as any
            )
        
        return (result as any)[0]?.affectedRows > 0
    }

    async getTranslation(id: number, tenantId: number): Promise<TranslationPublic | undefined> {
        const [row] = await this.database
            .select({
                id: diagnostic_translations.id,
                entity_type: diagnostic_translations.entity_type,
                entity_id: diagnostic_translations.entity_id,
                language_code: diagnostic_translations.language_code,
                translated_text: diagnostic_translations.translated_text,
                tenant_id: diagnostic_translations.tenant_id,
                created_at: diagnostic_translations.created_at,
                updated_at: diagnostic_translations.updated_at,
            })
            .from(diagnostic_translations)
            .where(
                and(
                    eq(diagnostic_translations.id, id),
                    eq(diagnostic_translations.tenant_id, tenantId)
                ) as any
            )
        
        return row as any
    }

    async deleteTranslation(id: number, tenantId: number): Promise<boolean> {
        const result = await this.database
            .delete(diagnostic_translations)
            .where(
                and(
                    eq(diagnostic_translations.id, id),
                    eq(diagnostic_translations.tenant_id, tenantId)
                ) as any
            )
        
        return (result as any)[0]?.affectedRows > 0
    }

    async getQuestionTranslations(questionId: number, tenantId: number): Promise<QuestionTranslations> {
        // Get question translations
        const questionTranslations = await this.database
            .select({
                language_code: diagnostic_translations.language_code,
                translated_text: diagnostic_translations.translated_text,
            })
            .from(diagnostic_translations)
            .where(
                and(
                    eq(diagnostic_translations.entity_type, 'question'),
                    eq(diagnostic_translations.entity_id, questionId),
                    eq(diagnostic_translations.tenant_id, tenantId)
                ) as any
            )

        // Get option IDs for this question
        const options = await this.database
            .select({ id: diagnostic_question_options.id })
            .from(diagnostic_question_options)
            .where(eq(diagnostic_question_options.question_id, questionId))

        const optionIds = options.map(o => o.id)

        // Get option translations
        let optionTranslations: any[] = []
        if (optionIds.length > 0) {
            optionTranslations = await this.database
                .select({
                    entity_id: diagnostic_translations.entity_id,
                    language_code: diagnostic_translations.language_code,
                    translated_text: diagnostic_translations.translated_text,
                })
                .from(diagnostic_translations)
                .where(
                    and(
                        eq(diagnostic_translations.entity_type, 'option'),
                        eq(diagnostic_translations.tenant_id, tenantId),
                        sql`${diagnostic_translations.entity_id} IN (${sql.join(optionIds.map(id => sql`${id}`), sql`, `)})`
                    ) as any
                )
        }

        // Build the response structure
        const translations: any = {}
        
        questionTranslations.forEach((qt: any) => {
            if (!translations[qt.language_code]) {
                translations[qt.language_code] = {
                    question_text: qt.translated_text,
                    options: {}
                }
            } else {
                translations[qt.language_code].question_text = qt.translated_text
            }
        })

        optionTranslations.forEach((ot: any) => {
            if (!translations[ot.language_code]) {
                translations[ot.language_code] = {
                    question_text: '',
                    options: {}
                }
            }
            translations[ot.language_code].options[ot.entity_id] = ot.translated_text
        })

        return {
            question_id: questionId,
            translations
        }
    }

    async upsertTranslation(payload: TranslationCreateInput, tenantId: number): Promise<TranslationPublic | undefined> {
        // Check if translation already exists
        const [existing] = await this.database
            .select({ id: diagnostic_translations.id })
            .from(diagnostic_translations)
            .where(
                and(
                    eq(diagnostic_translations.entity_type, payload.entity_type),
                    eq(diagnostic_translations.entity_id, payload.entity_id),
                    eq(diagnostic_translations.language_code, payload.language_code),
                    eq(diagnostic_translations.tenant_id, tenantId)
                ) as any
            )
            .limit(1)

        if (existing) {
            // Update existing
            await this.database
                .update(diagnostic_translations)
                .set({
                    translated_text: payload.translated_text,
                    updated_at: sql`CURRENT_TIMESTAMP`,
                })
                .where(eq(diagnostic_translations.id, existing.id))
            
            return this.getTranslation(existing.id, tenantId)
        } else {
            // Create new
            return this.createTranslation(payload, tenantId)
        }
    }

    // ==================== BULK OPERATIONS ====================

    async bulkCreateQuestionSet(payload: any, tenantId: number): Promise<QuestionSetPublic | undefined> {
        // Create the question set first
        const questionSet = await this.createQuestionSet({
            title: payload.title,
            description: payload.description,
            status: payload.status,
            tenant_id: tenantId
        })

        if (!questionSet) throw new Error('Failed to create question set')

        // Process each question
        for (const questionData of payload.questions) {
            // Create question
            const question = await this.createQuestion({
                question_text: questionData.question_text,
                description: questionData.description,
                status: questionData.status ?? true,
                models: questionData.models ?? null,
                tenant_id: tenantId
            })

            if (!question) throw new Error('Failed to create question')

            // Create options and map temp IDs to real IDs
            const optionIdMap = new Map<string, number>()
            for (const optionData of questionData.options) {
                const option = await this.createQuestionOption({
                    question_id: question.id,
                    option_text: optionData.option_text,
                    message: optionData.message,
                    display_order: optionData.display_order,
                    status: optionData.status ?? true
                })

                if (option && optionData._tempId) {
                    optionIdMap.set(optionData._tempId, option.id)
                }
            }

            // Create translations if provided
            if (questionData.translations && questionData.translations.length > 0) {
                for (const translation of questionData.translations) {
                    // Upsert question translation
                    await this.upsertTranslation({
                        entity_type: 'question',
                        entity_id: question.id,
                        language_code: translation.language_code,
                        translated_text: translation.question_text
                    }, tenantId)

                    // Upsert option translations
                    for (const optionTranslation of translation.options) {
                        // Find the real option ID using temp ID
                        const realOptionId = optionTranslation._tempId 
                            ? optionIdMap.get(optionTranslation._tempId) 
                            : null

                        if (realOptionId) {
                            await this.upsertTranslation({
                                entity_type: 'option',
                                entity_id: realOptionId,
                                language_code: translation.language_code,
                                translated_text: optionTranslation.option_text
                            }, tenantId)
                        }
                    }
                }
            }

            // Add question to set
            await this.addQuestionToSet(questionSet.id, {
                question_id: question.id,
                display_order: questionData.display_order
            }, tenantId)
        }

        return this.getQuestionSet(questionSet.id, tenantId)
    }

    async bulkUpdateQuestionSet(setId: number, payload: any, tenantId: number): Promise<QuestionSetPublic | undefined> {
        // Update question set basic info
        if (payload.title || payload.description || payload.status !== undefined) {
            await this.updateQuestionSet(setId, {
                title: payload.title,
                description: payload.description,
                status: payload.status
            }, tenantId)
        }

        // Remove deleted questions from set
        if (payload.deleted_question_ids && payload.deleted_question_ids.length > 0) {
            for (const questionId of payload.deleted_question_ids) {
                await this.removeQuestionFromSet(setId, questionId, tenantId)
            }
        }

        // Process each question
        for (const questionData of payload.questions) {
            if (questionData.id) {
                // Update existing question
                await this.updateQuestion(questionData.id, {
                    question_text: questionData.question_text,
                    description: questionData.description,
                    status: questionData.status,
                    models: questionData.models
                }, tenantId)

                // Get existing options
                const existingOptions = await this.listQuestionOptions(questionData.id)
                const existingOptionIds = new Set(existingOptions.map(o => o.id))
                const providedOptionIds = new Set(questionData.options.filter((o: any) => o.id).map((o: any) => o.id))

                // Delete options that are no longer in the list
                for (const existingOption of existingOptions) {
                    if (!providedOptionIds.has(existingOption.id)) {
                        await this.deleteQuestionOption(existingOption.id)
                    }
                }

                // Update or create options
                const optionIdMap = new Map<string, number>()
                for (const optionData of questionData.options) {
                    if (optionData.id) {
                        // Update existing option
                        await this.updateQuestionOption(optionData.id, {
                            option_text: optionData.option_text,
                            message: optionData.message,
                            display_order: optionData.display_order,
                            status: optionData.status
                        })
                        if (optionData._tempId) {
                            optionIdMap.set(optionData._tempId, optionData.id)
                        }
                    } else {
                        // Create new option
                        const newOption = await this.createQuestionOption({
                            question_id: questionData.id,
                            option_text: optionData.option_text,
                            message: optionData.message,
                            display_order: optionData.display_order,
                            status: optionData.status ?? true
                        })
                        if (newOption && optionData._tempId) {
                            optionIdMap.set(optionData._tempId, newOption.id)
                        }
                    }
                }

                // Update translations
                if (questionData.translations && questionData.translations.length > 0) {
                    for (const translation of questionData.translations) {
                        await this.upsertTranslation({
                            entity_type: 'question',
                            entity_id: questionData.id,
                            language_code: translation.language_code,
                            translated_text: translation.question_text
                        }, tenantId)

                        for (const optionTranslation of translation.options) {
                            const realOptionId = optionTranslation.option_id 
                                || (optionTranslation._tempId ? optionIdMap.get(optionTranslation._tempId) : null)

                            if (realOptionId) {
                                await this.upsertTranslation({
                                    entity_type: 'option',
                                    entity_id: realOptionId,
                                    language_code: translation.language_code,
                                    translated_text: optionTranslation.option_text
                                }, tenantId)
                            }
                        }
                    }
                }

            } else {
                // Create new question
                const question = await this.createQuestion({
                    question_text: questionData.question_text,
                    description: questionData.description,
                    status: questionData.status ?? true,
                    models: questionData.models ?? null,
                    tenant_id: tenantId
                })

                if (!question) throw new Error('Failed to create question')

                // Create options
                const optionIdMap = new Map<string, number>()
                for (const optionData of questionData.options) {
                    const option = await this.createQuestionOption({
                        question_id: question.id,
                        option_text: optionData.option_text,
                        message: optionData.message,
                        display_order: optionData.display_order,
                        status: optionData.status ?? true
                    })

                    if (option && optionData._tempId) {
                        optionIdMap.set(optionData._tempId, option.id)
                    }
                }

                // Create translations
                if (questionData.translations && questionData.translations.length > 0) {
                    for (const translation of questionData.translations) {
                        await this.upsertTranslation({
                            entity_type: 'question',
                            entity_id: question.id,
                            language_code: translation.language_code,
                            translated_text: translation.question_text
                        }, tenantId)

                        for (const optionTranslation of translation.options) {
                            const realOptionId = optionTranslation._tempId 
                                ? optionIdMap.get(optionTranslation._tempId) 
                                : null

                            if (realOptionId) {
                                await this.upsertTranslation({
                                    entity_type: 'option',
                                    entity_id: realOptionId,
                                    language_code: translation.language_code,
                                    translated_text: optionTranslation.option_text
                                }, tenantId)
                            }
                        }
                    }
                }

                // Add question to set
                await this.addQuestionToSet(setId, {
                    question_id: question.id,
                    display_order: questionData.display_order
                }, tenantId)
            }
        }

        return this.getQuestionSet(setId, tenantId)
    }
}
