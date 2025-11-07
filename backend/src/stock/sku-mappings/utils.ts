import type { ValidationResult, ValidationError, SkuPropertyKey } from './types'

// Allowed property keys for SKU mapping conditions
export const ALLOWED_PROPERTY_KEYS: SkuPropertyKey[] = ['make', 'model_name', 'storage', 'color', 'grade']

// Static property value validation (in a real app, these could come from config)
export const ALLOWED_PROPERTY_VALUES: Record<Exclude<SkuPropertyKey, 'grade'>, string[]> = {
  make: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Huawei', 'Xiaomi', 'Sony', 'LG', 'Motorola', 'Nokia'],
  model_name: ['iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15', 'Galaxy S22', 'Galaxy S23', 'Galaxy S24', 'Pixel 6', 'Pixel 7', 'Pixel 8'],
  storage: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'],
  color: ['Black', 'White', 'Silver', 'Gold', 'Rose Gold', 'Space Gray', 'Blue', 'Green', 'Red', 'Purple', 'Yellow']
}

/**
 * Canonical key builder for SKU mapping conditions
 * Ensures consistent key generation regardless of input order
 */
export class CanonicalKeyBuilder {
  /**
   * Normalize a single key-value pair
   */
  static normalize(key: string, value: string): { key: string; value: string } {
    return {
      key: key.trim().toLowerCase(),
      value: value.trim()
    }
  }

  /**
   * Build canonical key from conditions object
   * Format: key1=value1|key2=value2|...
   * Keys are sorted alphabetically for consistency
   */
  static build(conditions: Record<string, string>): string {
    const normalizedPairs: { key: string; value: string }[] = []
    
    for (const [key, value] of Object.entries(conditions)) {
      const normalized = this.normalize(key, value)
      normalizedPairs.push(normalized)
    }

    // Sort by key for consistent ordering
    normalizedPairs.sort((a, b) => a.key.localeCompare(b.key))

    // Build canonical key string
    return normalizedPairs
      .map(pair => `${pair.key}=${pair.value.toLowerCase()}`)
      .join('|')
  }
}

/**
 * Validator for SKU mapping data
 */
export class SkuMappingValidator {
  /**
   * Validate conditions object
   */
  static validateConditions(conditions: Record<string, string>, availableGrades?: string[]): ValidationResult {
    const errors: ValidationError[] = []

    // Check if conditions is non-empty
    if (!conditions || Object.keys(conditions).length === 0) {
      errors.push({
        field: 'conditions',
        message: 'At least one condition is required',
        value: conditions
      })
      return { valid: false, errors }
    }

    // Check each condition
    const usedKeys = new Set<string>()
    for (const [key, value] of Object.entries(conditions)) {
      // Check for duplicate keys
      if (usedKeys.has(key)) {
        errors.push({
          field: `conditions.${key}`,
          message: 'Duplicate property key in conditions',
          value: key
        })
        continue
      }
      usedKeys.add(key)

      // Validate key
      if (!ALLOWED_PROPERTY_KEYS.includes(key as SkuPropertyKey)) {
        errors.push({
          field: `conditions.${key}`,
          message: `Invalid property key. Allowed keys: ${ALLOWED_PROPERTY_KEYS.join(', ')}`,
          value: key
        })
        continue
      }

      // Validate value
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        errors.push({
          field: `conditions.${key}`,
          message: 'Property value cannot be empty',
          value: value
        })
        continue
      }

      // Validate specific property values
      if (key === 'grade') {
        // Grade values come from API - validate against provided list
        if (availableGrades && availableGrades.length > 0 && !availableGrades.includes(value)) {
          errors.push({
            field: `conditions.${key}`,
            message: `Invalid grade value. Available grades: ${availableGrades.join(', ')}`,
            value: value
          })
        }
      } else {
        // Static property values
        const allowedValues = ALLOWED_PROPERTY_VALUES[key as Exclude<SkuPropertyKey, 'grade'>]
        if (allowedValues && !allowedValues.includes(value)) {
          errors.push({
            field: `conditions.${key}`,
            message: `Invalid ${key} value. Allowed values: ${allowedValues.join(', ')}`,
            value: value
          })
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Validate SKU string
   */
  static validateSku(sku: string): ValidationResult {
    const errors: ValidationError[] = []

    if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
      errors.push({
        field: 'sku',
        message: 'SKU is required and cannot be empty',
        value: sku
      })
    } else if (sku.trim().length > 255) {
      errors.push({
        field: 'sku',
        message: 'SKU cannot exceed 255 characters',
        value: sku
      })
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Validate complete create/update input
   */
  static validateInput(
    sku: string, 
    conditions: Record<string, string>, 
    availableGrades?: string[]
  ): ValidationResult {
    const errors: ValidationError[] = []

    // Validate SKU
    const skuValidation = this.validateSku(sku)
    errors.push(...skuValidation.errors)

    // Validate conditions
    const conditionsValidation = this.validateConditions(conditions, availableGrades)
    errors.push(...conditionsValidation.errors)

    return { valid: errors.length === 0, errors }
  }
}

/**
 * Transform database record to API response format
 */
export function transformToApiResponse(record: {
  id: string
  sku: string
  conditions: Record<string, string>
  created_at: Date | null
  updated_at: Date | null
}): {
  id: string
  sku: string
  conditions: Record<string, string>
  created_at: string
  updated_at: string
} {
  return {
    id: record.id,
    sku: record.sku,
    conditions: record.conditions,
    created_at: record.created_at?.toISOString() || '',
    updated_at: record.updated_at?.toISOString() || ''
  }
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}