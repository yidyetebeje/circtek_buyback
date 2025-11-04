import { SkuMappingsRepository } from './repository'
import { SkuMappingValidator, CanonicalKeyBuilder, transformToApiResponse } from './utils'
import type { 
  SkuMappingCreateInput, 
  SkuMappingUpdateInput, 
  SkuMappingQueryInput,
  SkuMappingResponse,
  SkuMappingListResponse
} from './types'
import type { response } from '../../types/response'
import { GradesController } from '../../configuration/grades/controller'
import { GradesRepository } from '../../configuration/grades/repository'
import { db } from '../../db'

export class SkuMappingsController {
  private repository: SkuMappingsRepository
  private gradesController: GradesController

  constructor() {
    this.repository = new SkuMappingsRepository()
    this.gradesController = new GradesController(new GradesRepository(db))
  }

  /**
   * Get available grades from the grades API
   */
  private async getAvailableGrades(tenantId: number): Promise<string[]> {
    try {
      const result = await this.gradesController.list(
        tenantId, 
        undefined, // currentRole - we're calling from internal service
        tenantId,
        undefined, // search
        1, // page
        1000 // limit - get all grades
      )
      
      if (result.status === 200 && result.data) {
        return result.data.map(grade => grade.name)
      }
      
      // Fallback if API call fails
      return ['AGRA', 'BGRA', 'CGRA', 'DGRA']
    } catch (error) {
      console.warn('Failed to fetch grades from API, using fallback list:', error)
      return ['AGRA', 'BGRA', 'CGRA', 'DGRA']
    }
  }

  /**
   * List all SKU mappings with filtering and pagination
   */
  async list(query: SkuMappingQueryInput, tenantId: number): Promise<response<SkuMappingListResponse>> {
    try {
      const result = await this.repository.findAll(query, tenantId)
      
      const mappings: SkuMappingResponse[] = result.rows.map(transformToApiResponse)
      
      const responseData: SkuMappingListResponse = {
        data: mappings,
        message: 'SKU mappings retrieved successfully',
        status: 200,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit
        }
      }

      return {
        data: responseData,
        message: 'SKU mappings retrieved successfully',
        status: 200
      }
    } catch (error) {
      console.error('Failed to list SKU mappings:', error)
      return {
        data: [],
        message: 'Failed to retrieve SKU mappings',
        status: 500,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get single SKU mapping by ID
   */
  async getById(id: string, tenantId: number): Promise<response<SkuMappingResponse | null>> {
    try {
      const mapping = await this.repository.findById(id, tenantId)
      
      if (!mapping) {
        return {
          data: null,
          message: 'SKU mapping not found',
          status: 404
        }
      }

      return {
        data: transformToApiResponse(mapping),
        message: 'SKU mapping retrieved successfully',
        status: 200
      }
    } catch (error) {
      console.error('Failed to get SKU mapping:', error)
      return {
        data: null,
        message: 'Failed to retrieve SKU mapping',
        status: 500,
        error: (error as Error).message
      }
    }
  }

  /**
   * Create new SKU mapping
   */
  async create(payload: SkuMappingCreateInput, tenantId: number): Promise<response<SkuMappingResponse | null>> {
    try {
      // Get available grades for validation
      const availableGrades = await this.getAvailableGrades(tenantId)
      
      // Validate input
      

      // Check for duplicate canonical key
      const canonicalKey = CanonicalKeyBuilder.build(payload.conditions)
      const existing = await this.repository.findByCanonicalKey(canonicalKey, tenantId)
      
      if (existing) {
        return {
          data: null,
          message: 'A mapping with these conditions already exists',
          status: 409,
          error: 'Duplicate mapping rule'
        }
      }

      // Create the mapping
      const created = await this.repository.create({
        sku: payload.sku.trim(),
        conditions: payload.conditions
      }, tenantId)

      return {
        data: transformToApiResponse(created),
        message: 'SKU mapping created successfully',
        status: 201
      }
    } catch (error) {
      console.error('Failed to create SKU mapping:', error)
      return {
        data: null,
        message: 'Failed to create SKU mapping',
        status: 500,
        error: (error as Error).message
      }
    }
  }

  /**
   * Update existing SKU mapping
   */
  async update(
    id: string, 
    payload: SkuMappingUpdateInput, 
    tenantId: number
  ): Promise<response<SkuMappingResponse | null>> {
    try {
      // Check if mapping exists
      const existing = await this.repository.findById(id, tenantId)
      if (!existing) {
        return {
          data: null,
          message: 'SKU mapping not found',
          status: 404
        }
      }

      // Get available grades for validation
    

      // Check for duplicate canonical key (excluding current mapping)
      const canonicalKey = CanonicalKeyBuilder.build(payload.conditions)
      const isDuplicate = await this.repository.canonicalKeyExists(canonicalKey, tenantId, id)
      
      if (isDuplicate) {
        return {
          data: null,
          message: 'A mapping with these conditions already exists',
          status: 409,
          error: 'Duplicate mapping rule'
        }
      }

      // Update the mapping
      const updated = await this.repository.update(id, {
        sku: payload.sku.trim(),
        conditions: payload.conditions
      }, tenantId)

    

      return {
        data: transformToApiResponse(updated),
        message: 'SKU mapping updated successfully',
        status: 200
      }
    } catch (error) {
      console.error('Failed to update SKU mapping:', error)
      return {
        data: null,
        message: 'Failed to update SKU mapping',
        status: 500,
        error: (error as Error).message
      }
    }
  }

  /**
   * Delete SKU mapping
   */
  async delete(id: string, tenantId: number): Promise<response<{ id: string } | null>> {
    try {
      // Check if mapping exists
      const existing = await this.repository.findById(id, tenantId)
      if (!existing) {
        return {
          data: null,
          message: 'SKU mapping not found',
          status: 404
        }
      }

      // Delete the mapping
      const deleted = await this.repository.delete(id, tenantId)
      
      if (!deleted) {
        return {
          data: null,
          message: 'Failed to delete SKU mapping',
          status: 500
        }
      }

      return {
        data: { id },
        message: 'SKU mapping deleted successfully',
        status: 200
      }
    } catch (error) {
      console.error('Failed to delete SKU mapping:', error)
      return {
        data: null,
        message: 'Failed to delete SKU mapping',
        status: 500,
        error: (error as Error).message
      }
    }
  }

  /**
   * Find SKU mapping by conditions (for runtime SKU resolution)
   * This method can be used by other services to resolve SKU from device properties
   */
  async findByConditions(
    conditions: Record<string, string>, 
    tenantId: number
  ): Promise<response<SkuMappingResponse | null>> {
    try {
      const canonicalKey = CanonicalKeyBuilder.build(conditions)
      const mapping = await this.repository.findByCanonicalKey(canonicalKey, tenantId)
      
      if (!mapping) {
        return {
          data: null,
          message: 'No matching SKU mapping found for the given conditions',
          status: 404
        }
      }

      return {
        data: transformToApiResponse(mapping),
        message: 'SKU mapping found',
        status: 200
      }
    } catch (error) {
      console.error('Failed to find SKU mapping by conditions:', error)
      return {
        data: null,
        message: 'Failed to find SKU mapping',
        status: 500,
        error: (error as Error).message
      }
    }
  }
}