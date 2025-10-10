import { and, eq } from 'drizzle-orm'
import { db } from '../../db'
import { users, wifi_profile, workflows, label_templates, ota_update, tenants, diagnostic_question_sets } from '../../db/circtek.schema'
import type { TesterAssignments } from './types'
import { DiagnosticQuestionsRepository } from '../diagnostic-questions/repository'

export class TesterAssignmentsRepository {
    private diagnosticQuestionsRepo: DiagnosticQuestionsRepository
    
    constructor(private readonly database: typeof db) {
        this.diagnosticQuestionsRepo = new DiagnosticQuestionsRepository(database)
    }

    async getAllAssignments(testerId: number, tenantId: number): Promise<TesterAssignments | null> {
        // First check if tester exists and belongs to the tenant
        const [testerRow] = await this.database
            .select({ 
                id: users.id,
                wifi_profile_id: users.wifi_profile_id,
                workflow_id: users.workflow_id,
                label_template_id: users.label_template_id,
                ota_update_id: users.ota_update_id,
                diagnostic_question_set_id: users.diagnostic_question_set_id
            })
            .from(users)
            .where(and(eq(users.id, testerId), eq(users.tenant_id, tenantId)))

        if (!testerRow) return null

        const result: TesterAssignments = {
            tester_id: testerId,
            wifi_profile: null,
            workflow: null,
            label_template: null,
            ota_update: null,
            diagnostic_question_set: null
        }

        // Get WiFi Profile if assigned
        if (testerRow.wifi_profile_id) {
            const [wifiProfileRow] = await this.database
                .select({
                    id: wifi_profile.id,
                    name: wifi_profile.name,
                    ssid: wifi_profile.ssid,
                    password: wifi_profile.password,
                    status: wifi_profile.status,
                    tenant_id: wifi_profile.tenant_id,
                    tenant_name: tenants.name,
                    created_at: wifi_profile.created_at,
                    updated_at: wifi_profile.updated_at,
                })
                .from(wifi_profile)
                .leftJoin(tenants, eq(wifi_profile.tenant_id, tenants.id))
                .where(eq(wifi_profile.id, testerRow.wifi_profile_id))
            result.wifi_profile = wifiProfileRow as any
        }

        // Get Workflow if assigned
        if (testerRow.workflow_id) {
            const [workflowRow] = await this.database
                .select({
                    id: workflows.id,
                    name: workflows.name,
                    description: workflows.description,
                    status: workflows.status,
                    canvas_state: workflows.canvas_state,
                    position_x: workflows.position_x,
                    position_y: workflows.position_y,
                    scale: workflows.scale,
                    viewport_position_x: workflows.viewport_position_x,
                    viewport_position_y: workflows.viewport_position_y,
                    viewport_scale: workflows.viewport_scale,
                    grid_visible: workflows.grid_visible,
                    grid_size: workflows.grid_size,
                    is_published: workflows.is_published,
                    tenant_id: workflows.tenant_id,
                    tenant_name: tenants.name,
                    created_at: workflows.created_at,
                    updated_at: workflows.updated_at,
                })
                .from(workflows)
                .leftJoin(tenants, eq(workflows.tenant_id, tenants.id))
                .where(eq(workflows.id, testerRow.workflow_id))
            
            result.workflow = workflowRow as any
        }

        // Get Label Template if assigned
        if (testerRow.label_template_id) {
            const [labelTemplateRow] = await this.database
                .select({
                    id: label_templates.id,
                    name: label_templates.name,
                    description: label_templates.description,
                    status: label_templates.status,
                    canvas_state: label_templates.canvas_state,
                    tenant_id: label_templates.tenant_id,
                    tenant_name: tenants.name,
                    created_at: label_templates.created_at,
                    updated_at: label_templates.updated_at,
                })
                .from(label_templates)
                .leftJoin(tenants, eq(label_templates.tenant_id, tenants.id))
                .where(eq(label_templates.id, testerRow.label_template_id))
            result.label_template = labelTemplateRow as any
        }

        // Get OTA Update if assigned
        if (testerRow.ota_update_id) {
            const [otaUpdateRow] = await this.database
                .select({
                    id: ota_update.id,
                    version: ota_update.version,
                    url: ota_update.url,
                    target_os: ota_update.target_os,
                    target_architecture: ota_update.target_architecture,
                    release_channel: ota_update.release_channel,
                    tenant_id: ota_update.tenant_id,
                    tenant_name: tenants.name,
                    created_at: ota_update.created_at,
                    updated_at: ota_update.updated_at,
                })
                .from(ota_update)
                .leftJoin(tenants, eq(ota_update.tenant_id, tenants.id))
                .where(eq(ota_update.id, testerRow.ota_update_id))
            result.ota_update = otaUpdateRow as any
        }

        // Get Diagnostic Question Set if assigned (with questions and translations)
        if (testerRow.diagnostic_question_set_id) {
            const questionSetWithQuestions = await this.diagnosticQuestionsRepo.getQuestionSetWithQuestions(
                testerRow.diagnostic_question_set_id,
                tenantId
            )
            
            if (questionSetWithQuestions) {
                // Fetch translations for each question and embed them directly
                const questionsWithTranslations = await Promise.all(
                    questionSetWithQuestions.questions.map(async (question) => {
                        const translations = await this.diagnosticQuestionsRepo.getQuestionTranslations(
                            question.id,
                            tenantId
                        )
                        return {
                            ...question,
                            translations: translations
                        }
                    })
                )
                
                result.diagnostic_question_set = {
                    ...questionSetWithQuestions,
                    questions: questionsWithTranslations
                }
            }
        }

        return result
    }
}