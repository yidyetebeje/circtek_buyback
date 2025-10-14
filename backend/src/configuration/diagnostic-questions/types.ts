import { t, type Static } from 'elysia'

// Question Types
export const QuestionCreate = t.Object({
    question_text: t.String(),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
    models: t.Optional(t.Array(t.String())), // Array of model names; empty/null = all models
    tenant_id: t.Optional(t.Number()),
})

export const QuestionUpdate = t.Object({
    question_text: t.Optional(t.String()),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
    models: t.Optional(t.Array(t.String())), // Array of model names; empty/null = all models
})

export type QuestionCreateInput = Static<typeof QuestionCreate> & { tenant_id?: number }
export type QuestionUpdateInput = Static<typeof QuestionUpdate>

export type QuestionPublic = {
    id: number
    question_text: string
    description: string | null
    status: boolean | null
    models: string[] | null // Array of model names; null/empty = all models
    tenant_id: number
    tenant_name?: string | null
    created_at: string | null
    updated_at: string | null
}

// Question Option Types
export const QuestionOptionCreate = t.Object({
    question_id: t.Number(),
    option_text: t.String(),
    message: t.Optional(t.String()),
    display_order: t.Optional(t.Number()),
    status: t.Optional(t.Boolean()),
})

export const QuestionOptionUpdate = t.Object({
    option_text: t.Optional(t.String()),
    message: t.Optional(t.String()),
    display_order: t.Optional(t.Number()),
    status: t.Optional(t.Boolean()),
})

export type QuestionOptionCreateInput = Static<typeof QuestionOptionCreate>
export type QuestionOptionUpdateInput = Static<typeof QuestionOptionUpdate>

export type QuestionOptionPublic = {
    id: number
    question_id: number
    option_text: string
    message: string | null
    display_order: number | null
    status: boolean | null
    created_at: string | null
    updated_at: string | null
}

// Question Set Types
export const QuestionSetCreate = t.Object({
    title: t.String(),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
    tenant_id: t.Optional(t.Number()),
})

export const QuestionSetUpdate = t.Object({
    title: t.Optional(t.String()),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
})

export type QuestionSetCreateInput = Static<typeof QuestionSetCreate> & { tenant_id?: number }
export type QuestionSetUpdateInput = Static<typeof QuestionSetUpdate>

export type QuestionSetPublic = {
    id: number
    title: string
    description: string | null
    status: boolean | null
    tenant_id: number
    tenant_name?: string | null
    created_at: string | null
    updated_at: string | null
}

// Add/Remove questions to/from set
export const AddQuestionToSet = t.Object({
    question_id: t.Number(),
    display_order: t.Optional(t.Number()),
})

export type AddQuestionToSetInput = Static<typeof AddQuestionToSet>

// Assignment Types
export const AssignQuestionSet = t.Object({
    question_set_id: t.Number(),
    tester_id: t.Number(),
})

export type AssignQuestionSetInput = Static<typeof AssignQuestionSet>

export type QuestionSetAssignmentPublic = {
    id: number
    question_set_id: number | null
    question_set_title?: string | null
    tester_id: number
    tester_name?: string
    status: 'active' | 'inactive'
    tenant_id: number
    created_at: string | null
    updated_at: string | null
}

// Answer Types
export const SubmitAnswer = t.Object({
    question_text: t.String(),
    answer_text: t.String(),
    device_id: t.Optional(t.Number()),
    test_result_id: t.Optional(t.Number()),
})

export type SubmitAnswerInput = Static<typeof SubmitAnswer>

export type AnswerPublic = {
    id: number
    question_text: string
    answer_text: string
    device_id: number | null
    test_result_id: number | null
    answered_by: number
    answered_by_name?: string
    tenant_id: number
    created_at: string | null
}

// Full question with options
export type QuestionWithOptions = QuestionPublic & {
    options: QuestionOptionPublic[]
}

// Full question with options and translations
export type QuestionWithOptionsAndTranslations = QuestionWithOptions & {
    translations: QuestionTranslations
}

// Full question set with questions
export type QuestionSetWithQuestions = QuestionSetPublic & {
    questions: QuestionWithOptions[]
}

// Full question set with questions including translations
export type QuestionSetWithQuestionsAndTranslations = QuestionSetPublic & {
    questions: QuestionWithOptionsAndTranslations[]
}

// Translation Types
export const TranslationCreate = t.Object({
    entity_type: t.Union([t.Literal('question'), t.Literal('option')]),
    entity_id: t.Number(),
    language_code: t.String(),
    translated_text: t.String(),
})

export const TranslationUpdate = t.Object({
    translated_text: t.String(),
})

export const BulkTranslationCreate = t.Object({
    question_id: t.Number(),
    translations: t.Array(t.Object({
        language_code: t.String(),
        question_text: t.String(),
        options: t.Array(t.Object({
            option_id: t.Number(),
            option_text: t.String(),
        }))
    }))
})

export type TranslationCreateInput = Static<typeof TranslationCreate>
export type TranslationUpdateInput = Static<typeof TranslationUpdate>
export type BulkTranslationCreateInput = Static<typeof BulkTranslationCreate>

export type TranslationPublic = {
    id: number
    entity_type: 'question' | 'option'
    entity_id: number
    language_code: string
    translated_text: string
    tenant_id: number
    created_at: string | null
    updated_at: string | null
}

export type QuestionTranslations = {
    question_id: number
    translations: {
        [language_code: string]: {
            question_text: string
            options: {
                [option_id: number]: string
            }
        }
    }
}

// Bulk Question Set Creation Types
export const BulkQuestionSetCreate = t.Object({
    title: t.String(),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
    tenant_id: t.Optional(t.Number()),
    questions: t.Array(t.Object({
        question_text: t.String(),
        description: t.Optional(t.String()),
        status: t.Optional(t.Boolean()),
        models: t.Optional(t.Union([t.Array(t.String()), t.Null()])),
        display_order: t.Number(),
        options: t.Array(t.Object({
            option_text: t.String(),
            message: t.Optional(t.String()),
            display_order: t.Number(),
            status: t.Optional(t.Boolean()),
            _tempId: t.Optional(t.String()), // For mapping translations
        })),
        translations: t.Optional(t.Array(t.Object({
            language_code: t.String(),
            question_text: t.String(),
            options: t.Array(t.Object({
                option_text: t.String(),
                _tempId: t.Optional(t.String()), // To match with option _tempId
            }))
        })))
    }))
})

export type BulkQuestionSetCreateInput = Static<typeof BulkQuestionSetCreate>

// Bulk Question Set Update Types
export const BulkQuestionSetUpdate = t.Object({
    title: t.Optional(t.String()),
    description: t.Optional(t.String()),
    status: t.Optional(t.Boolean()),
    questions: t.Array(t.Object({
        id: t.Optional(t.Number()), // If has ID, update existing; otherwise create new
        question_text: t.String(),
        description: t.Optional(t.String()),
        status: t.Optional(t.Boolean()),
        models: t.Optional(t.Union([t.Array(t.String()), t.Null()])),
        display_order: t.Number(),
        options: t.Array(t.Object({
            id: t.Optional(t.Number()), // If has ID, update existing; otherwise create new
            option_text: t.String(),
            message: t.Optional(t.String()),
            display_order: t.Number(),
            status: t.Optional(t.Boolean()),
            _tempId: t.Optional(t.String()),
        })),
        translations: t.Optional(t.Array(t.Object({
            language_code: t.String(),
            question_text: t.String(),
            options: t.Array(t.Object({
                option_id: t.Optional(t.Number()),
                option_text: t.String(),
                _tempId: t.Optional(t.String()),
            }))
        })))
    })),
    deleted_question_ids: t.Optional(t.Array(t.Number())), // Questions to remove from set
})

export type BulkQuestionSetUpdateInput = Static<typeof BulkQuestionSetUpdate>
