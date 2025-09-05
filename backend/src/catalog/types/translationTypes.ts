import { t } from 'elysia';

// Base bulk translation schemas
export const BulkTranslationCreateSchema = t.Object({
  translations: t.Array(
    t.Object({
      language_id: t.Number({ minimum: 1 }),
      title: t.String({ minLength: 1, maxLength: 255 }),
      description: t.Optional(t.String()),
      meta_title: t.Optional(t.String({ maxLength: 255 })),
      meta_description: t.Optional(t.String()),
      meta_keywords: t.Optional(t.String()),
    })
  )
});

export const BulkTranslationWithSpecsCreateSchema = t.Object({
  translations: t.Array(
    t.Object({
      language_id: t.Number({ minimum: 1 }),
      title: t.String({ minLength: 1, maxLength: 255 }),
      description: t.Optional(t.String()),
      meta_title: t.Optional(t.String({ maxLength: 255 })),
      meta_description: t.Optional(t.String()),
      meta_keywords: t.Optional(t.String()),
      specifications: t.Optional(t.String()), // JSON string
    })
  )
});

export const BulkTranslationUpdateSchema = t.Object({
  translations: t.Array(
    t.Object({
      language_id: t.Number({ minimum: 1 }),
      title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      description: t.Optional(t.String()),
      meta_title: t.Optional(t.String({ maxLength: 255 })),
      meta_description: t.Optional(t.String()),
      meta_keywords: t.Optional(t.String()),
    })
  )
});

export const BulkTranslationWithSpecsUpdateSchema = t.Object({
  translations: t.Array(
    t.Object({
      language_id: t.Number({ minimum: 1 }),
      title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      description: t.Optional(t.String()),
      meta_title: t.Optional(t.String({ maxLength: 255 })),
      meta_description: t.Optional(t.String()),
      meta_keywords: t.Optional(t.String()),
      specifications: t.Optional(t.String()), // JSON string
    })
  )
});

// Bulk response types
export interface BulkTranslationResponse {
  success: boolean;
  data: {
    created: number;
    updated: number;
    errors: Array<{
      language_id: number;
      error: string;
    }>;
  };
  message: string;
}

// Common field mappings for different entities
export interface EntityTranslationMapping {
  title: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  specifications?: string;
}

export type BulkTranslationCreate = {
  translations: Array<{
    language_id: number;
    title: string;
    description?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    specifications?: string;
  }>;
}; 