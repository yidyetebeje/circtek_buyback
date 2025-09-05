import { t } from "elysia";

// Base FAQ type
export interface FAQ {
  id?: number;
  question: string;
  answer: string;
  order_no?: number;
  is_published?: boolean;
  shop_id: number;
  client_id: number;
  created_at?: string;
  updated_at?: string;
  translations?: FAQTranslation[];
}

// FAQ Translation type
export interface FAQTranslation {
  id?: number;
  faq_id: number;
  language_id: number;
  question: string;
  answer: string;
  language?: {
    id: number;
    code: string;
    name: string;
  };
}

// Create FAQ input type
export interface TFAQCreate {
  question: string;
  answer: string;
  order_no?: number;
  is_published?: boolean;
  shop_id: number;
  client_id: number;
}

// Update FAQ input type
export interface TFAQUpdate {
  question?: string;
  answer?: string;
  order_no?: number;
  is_published?: boolean;
}

// FAQ with translations create type
export interface TFAQWithTranslationsCreate {
  question: string;
  answer: string;
  order_no?: number;
  is_published?: boolean;
  shop_id: number;
  client_id: number;
  translations: {
    language_id: number;
    question: string;
    answer: string;
  }[];
}

// FAQ with translations update type  
export interface TFAQWithTranslationsUpdate {
  question?: string;
  answer?: string;
  order_no?: number;
  is_published?: boolean;
  translations?: {
    language_id: number;
    question: string;
    answer: string;
  }[];
}

// FAQ Translation create type
export interface TFAQTranslationCreate {
  question: string;
  answer: string;
}

// FAQ Translation update type
export interface TFAQTranslationUpdate {
  question?: string;
  answer?: string;
}

// Validation schemas using Elysia's type system
export const FAQCreateSchema = t.Object({
  question: t.String({ minLength: 1, maxLength: 500 }),
  answer: t.String({ minLength: 1 }),
  order_no: t.Optional(t.Number({ minimum: 0 })),
  is_published: t.Optional(t.Boolean()),
  shop_id: t.Number({ minimum: 1 }),
});

export const FAQUpdateSchema = t.Object({
  question: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
  answer: t.Optional(t.String({ minLength: 1 })),
  order_no: t.Optional(t.Number({ minimum: 0 })),
  is_published: t.Optional(t.Boolean()),
  shop_id: t.Number({ minimum: 1 }),
  translations: t.Array(t.Object({
    language_id: t.Number({ minimum: 1 }),
    question: t.String({ minLength: 1, maxLength: 500 }),
    answer: t.String({ minLength: 1 })
  }))
});

export const FAQWithTranslationsCreateSchema = t.Object({
  question: t.String({ minLength: 1, maxLength: 500 }),
  answer: t.String({ minLength: 1 }),
  order_no: t.Optional(t.Number({ minimum: 0 })),
  is_published: t.Optional(t.Boolean()),
  shop_id: t.Number({ minimum: 1 }),
  client_id: t.Number({ minimum: 1 }),
  translations: t.Array(t.Object({
    language_id: t.Number({ minimum: 1 }),
    question: t.String({ minLength: 1, maxLength: 500 }),
    answer: t.String({ minLength: 1 })
  }))
});

export const FAQWithTranslationsUpdateSchema = t.Object({
  question: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
  answer: t.Optional(t.String({ minLength: 1 })),
  order_no: t.Optional(t.Number({ minimum: 0 })),
  is_published: t.Optional(t.Boolean()),
  translations: t.Optional(t.Array(t.Object({
    language_id: t.Number({ minimum: 1 }),
    question: t.String({ minLength: 1, maxLength: 500 }),
    answer: t.String({ minLength: 1 })
  })))
});

export const FAQTranslationCreateSchema = t.Object({
  question: t.String({ minLength: 1, maxLength: 500 }),
  answer: t.String({ minLength: 1 })
});

export const FAQTranslationUpdateSchema = t.Object({
  question: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
  answer: t.Optional(t.String({ minLength: 1 }))
});

// Parameter schemas
export const FAQIdParamSchema = t.Object({
  faqId: t.Numeric({ minimum: 1 })
});

export const ShopIdParamSchema = t.Object({
  shopId: t.Numeric({ minimum: 1 })
});

// Query schemas
export const FAQPaginationQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  orderBy: t.Optional(t.String({ default: 'order_no' })),
  order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')], { default: 'asc' })),
  shop_id: t.Optional(t.Numeric({ minimum: 1 })),
  client_id: t.Optional(t.Numeric({ minimum: 1 })),
  is_published: t.Optional(t.Boolean()),
  search: t.Optional(t.String())
}); 