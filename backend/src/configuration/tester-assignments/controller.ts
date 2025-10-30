import type { response } from '../../types/response'
import { TesterAssignmentsRepository } from './repository'
import type { TesterAssignments } from './types'

export class TesterAssignmentsController {
    constructor(private readonly repo: TesterAssignmentsRepository) {}

    /**
     * Get all assignments for a specific tester
     * Returns all assigned entities (wifi profile, workflow, label template, ota update) in a single response
     */
    async getAllAssignments(testerId: number, tenantId: number): Promise<response<TesterAssignments | null>> {
        const assignments = await this.repo.getAllAssignments(testerId, tenantId)
        if (!assignments) {
            console.log('Tester not found or no access', { testerId, tenantId })
            return { data: null, message: 'Tester not found or no access', status: 404 }
        }
        console.log('Assignments', { assignments })
        return { data: assignments, message: 'OK', status: 200 }
    }
}