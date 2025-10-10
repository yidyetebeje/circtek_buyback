import type { WiFiProfilePublic } from '../wifi-profiles/types'
import type { WorkflowPublic } from '../workflows/types'
import type { LabelTemplatePublic } from '../label-templates/types'
import type { OtaUpdatePublic } from '../ota-updates/types'
import type { QuestionSetWithQuestions, QuestionTranslations } from '../diagnostic-questions/types'

export interface TesterAssignments {
    tester_id: number
    wifi_profile: WiFiProfilePublic | null
    workflow: WorkflowPublic | null
    label_template: LabelTemplatePublic | null
    ota_update: OtaUpdatePublic | null
    diagnostic_question_set: (QuestionSetWithQuestions & {
        question_translations: { [questionId: number]: QuestionTranslations }
    }) | null
}