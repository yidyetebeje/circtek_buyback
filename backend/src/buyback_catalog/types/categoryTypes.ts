import { t, type Static } from 'elysia';
import { createSelectSchema, createInsertSchema } from 'drizzle-typebox';
import { device_categories } from '../../db/buyback_catalogue.schema';
import { device_categories_translations } from '../../db/shops.schema';

// Base schemas generated from Drizzle tables
export const CategorySchema = createSelectSchema(device_categories);
export const CategoryTranslationSchema = createSelectSchema(device_categories_translations);

// Schema for creating a new category (omit auto-generated fields)
export const CategoryInsertSchema = createInsertSchema(device_categories);
export const CategoryCreateSchema = t.Omit(CategoryInsertSchema, ['id', 'createdAt', 'updatedAt']);

// Schema for updating an existing category (make all fields optional)
export const CategoryUpdateSchema = t.Partial(CategoryCreateSchema);

// Schema for category translations
export const CategoryTranslationInsertSchema = createInsertSchema(device_categories_translations);
export const CategoryTranslationCreateSchema = t.Omit(CategoryTranslationInsertSchema, ['id']);
export const CategoryTranslationUpdateSchema = t.Partial(
  t.Omit(CategoryTranslationCreateSchema, ['category_id', 'language_id'])
);

// Schema for request body when creating a category with translations
export const CategoryWithTranslationsCreateSchema = t.Object({
  category: CategoryCreateSchema,
  translations: t.Optional(t.Array(CategoryTranslationCreateSchema))
});

// Schema for request body when updating a category with translations
export const CategoryWithTranslationsUpdateSchema = t.Object({
  category: CategoryUpdateSchema,
  translations: t.Optional(t.Array(t.Object({
    language_id: t.Number(),
    title: t.Optional(t.String()),
    description: t.Optional(t.String()),
    meta_title: t.Optional(t.String()),
    meta_description: t.Optional(t.String()),
    meta_keywords: t.Optional(t.String())
  })))
});

// Schema for response when returning a category with translations
export const CategoryWithTranslationsResponseSchema = t.Object({
  ...CategorySchema.properties,
  translations: t.Array(CategoryTranslationSchema)
});

// Schema for validating category ID in URL parameters
export const CategoryIdParamSchema = t.Object({
  categoryId: t.Numeric({ minimum: 1, error: 'Category ID must be a positive number' })
});

// Schema for filtering categories by tenant_id
export const CategoryFilterSchema = t.Object({
  tenant_id: t.Optional(t.Numeric({ minimum: 1 }))
});

// Schema for file upload
export const FileUploadSchema = t.Object({
  file: t.Any()
});

// Schema for pagination query parameters
export const PaginationQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  orderBy: t.Optional(t.String({ default: 'order_no' })),
  order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')], { default: 'asc' })),
  tenantId: t.Optional(t.Numeric({ minimum: 1 }))
});

// Schema for category slug and tenant ID in URL parameters
export const CategorySlugParamSchema = t.Object({
  slug: t.String(),
  tenantId: t.Numeric({ minimum: 1 })
});

// Schema for translation parameters (categoryId and optional languageId)
export const TranslationParamsSchema = t.Object({
  categoryId: t.Numeric({ minimum: 1 }),
  languageId: t.Optional(t.Numeric({ minimum: 1 }))
});

// Schema for routes requiring both categoryId and languageId as path parameters
export const CategoryAndLanguageParamsSchema = t.Object({
  categoryId: t.Numeric({ minimum: 1 }),
  languageId: t.Numeric({ minimum: 1 })
});

// Static types for convenience
export type TCategory = Static<typeof CategorySchema>;
export type TCategoryCreate = Static<typeof CategoryCreateSchema>;
export type TCategoryUpdate = Static<typeof CategoryUpdateSchema>;
export type TCategoryWithTranslationsCreate = Static<typeof CategoryWithTranslationsCreateSchema>;
export type TCategoryWithTranslationsUpdate = Static<typeof CategoryWithTranslationsUpdateSchema>;
export type TCategoryWithTranslationsResponse = Static<typeof CategoryWithTranslationsResponseSchema>;
export type TCategoryTranslationCreate = Static<typeof CategoryTranslationCreateSchema>;
export type TCategoryTranslationInsert = Static<typeof CategoryTranslationInsertSchema>;
export type TCategoryTranslationUpdate = Static<typeof CategoryTranslationUpdateSchema>;
