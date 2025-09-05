import { t } from 'elysia';
import { TranslatableEntity } from '../services/aiTranslationService';

// Request schema for AI translation
export const AITranslationRequestSchema = t.Object({
  entityType: t.Union([
    t.Literal('category'),
    t.Literal('brand'), 
    t.Literal('model_series'),
    t.Literal('model'),
    t.Literal('question_set'),
    t.Literal('faq')
  ]),
  sourceLanguageCode: t.String({ minLength: 2, maxLength: 10 }),
  targetLanguageCode: t.String({ minLength: 2, maxLength: 10 }),
  data: t.Object({
    title: t.String({ minLength: 1 }),
    description: t.Optional(t.String()),
    meta_title: t.Optional(t.String()),
    meta_description: t.Optional(t.String()),
    meta_keywords: t.Optional(t.String()),
    specifications: t.Optional(t.Any()),
    // For question sets - hierarchical structure
    questions: t.Optional(t.Array(t.Object({
      id: t.Optional(t.Numeric()),
      title: t.String({ minLength: 1 }),
      tooltip: t.Optional(t.String()),
      category: t.Optional(t.String()),
      options: t.Optional(t.Array(t.Object({
        id: t.Optional(t.Numeric()),
        title: t.String({ minLength: 1 }),
      }))),
    }))),
  })
});

// Bulk translation request schema
export const AIBulkTranslationRequestSchema = t.Object({
  entityType: t.Union([
    t.Literal('category'),
    t.Literal('brand'), 
    t.Literal('model_series'),
    t.Literal('model'),
    t.Literal('question_set'),
    t.Literal('faq')
  ]),
  sourceLanguageCode: t.String({ minLength: 2, maxLength: 10 }),
  targetLanguageCodes: t.Array(t.String({ minLength: 2, maxLength: 10 })),
  data: t.Object({
    title: t.String({ minLength: 1 }),
    description: t.Optional(t.String()),
    meta_title: t.Optional(t.String()),
    meta_description: t.Optional(t.String()),
    meta_keywords: t.Optional(t.String()),
    specifications: t.Optional(t.Any()),
    // For question sets - hierarchical structure
    questions: t.Optional(t.Array(t.Object({
      id: t.Optional(t.Numeric()),
      title: t.String({ minLength: 1 }),
      tooltip: t.Optional(t.String()),
      category: t.Optional(t.String()),
      options: t.Optional(t.Array(t.Object({
        id: t.Optional(t.Numeric()),
        title: t.String({ minLength: 1 }),
      }))),
    }))),
  })
});

// Response schema for AI translation
export const AITranslationResponseSchema = t.Object({
  title: t.String(),
  description: t.Optional(t.String()),
  meta_title: t.Optional(t.String()),
  meta_description: t.Optional(t.String()),
  meta_keywords: t.Optional(t.String()),
  specifications: t.Optional(t.Any()),
  // For question sets - hierarchical structure
  questions: t.Optional(t.Array(t.Object({
    id: t.Optional(t.Numeric()),
    title: t.String({ minLength: 1 }),
    tooltip: t.Optional(t.String()),
    category: t.Optional(t.String()),
    options: t.Optional(t.Array(t.Object({
      id: t.Optional(t.Numeric()),
      title: t.String({ minLength: 1 }),
    }))),
  }))),
});

// TypeScript types
export interface AITranslationRequest {
  entityType: TranslatableEntity;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  data: {
    title: string;
    description?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    specifications?: Record<string, unknown>;
    questions?: Array<{
      id?: number;
      title: string;
      tooltip?: string;
      category?: string;
      options?: Array<{ id?: number; title: string }>;
    }>;
  };
}

export interface AIBulkTranslationRequest {
  entityType: TranslatableEntity;
  sourceLanguageCode: string;
  targetLanguageCodes: string[];
  data: {
    title: string;
    description?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    specifications?: Record<string, unknown>;
    questions?: Array<{
      id?: number;
      title: string;
      tooltip?: string;
      category?: string;
      options?: Array<{ id?: number; title: string }>;
    }>;
  };
}

export interface AITranslationResponse {
  title: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  specifications?: Record<string, unknown>;
  questions?: Array<{
    id?: number;
    title: string;
    tooltip?: string;
    category?: string;
    options?: Array<{ id?: number; title: string }>;
  }>;
} 