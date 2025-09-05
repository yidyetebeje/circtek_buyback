import { brands } from "../../db/buyback_catalogue.schema";
import { brand_translations } from "../../db/shops.schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { t } from 'elysia';

// Base types inferred from schema
export type TBrand = InferSelectModel<typeof brands>;
export type TBrandInsert = InferInsertModel<typeof brands>;
export type TBrandTranslation = InferSelectModel<typeof brand_translations>;
export type TBrandTranslationInsert = InferInsertModel<typeof brand_translations>;

// Basic Translation Type (used in create/update)
export type TBrandTranslationCreate = {
  language_id: number;
  title: string;
  description?: string | null;
  meta_title?: string | null;
  sef_url?: string | null;
  meta_canonical_url?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
};

// Brand Create Type (includes translations)
export type TBrandCreate = {
  title: string;
  icon?: string | null;
  description?: string | null;
  meta_title?: string | null;
  sef_url?: string | null;
  meta_canonical_url?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  order_no?: number | null;
  tenant_id: number;
  translations?: TBrandTranslationCreate[];
};

// Brand Update Type (all fields optional, includes translations)
export type TBrandUpdate = Partial<Omit<TBrandCreate, 'tenant_id'>> // tenant_id usually shouldn't be updated

// --- Elysia Validation Schemas ---

const BrandTranslationSchema = t.Object({
    language_id: t.Numeric(),
    title: t.String({ minLength: 1 }),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    sef_url: t.Optional(t.Nullable(t.String())),
    meta_canonical_url: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String()))
});

export const BrandCreateSchema = t.Object({
    title: t.String({ minLength: 1 }),
    icon: t.Optional(t.Nullable(t.String())),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    sef_url: t.Optional(t.Nullable(t.String())),
    meta_canonical_url: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String())),
    order_no: t.Optional(t.Nullable(t.Numeric())),
    tenant_id: t.Numeric(),
    translations: t.Optional(t.Array(BrandTranslationSchema))
});

export const BrandUpdateSchema = t.Object({
    title: t.Optional(t.String({ minLength: 1 })),
    icon: t.Optional(t.Nullable(t.String())),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    sef_url: t.Optional(t.Nullable(t.String())),
    meta_canonical_url: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String())),
    order_no: t.Optional(t.Nullable(t.Numeric())),
    // tenant_id is omitted - typically not updatable via standard PUT
    translations: t.Optional(t.Array(BrandTranslationSchema))
});

// File upload schema for brand icons
export const FileUploadSchema = t.Object({
    file: t.File({
        type: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
        maxSize: 5 * 1024 * 1024 // 5MB
    })
});

// --- Elysia Validation Schemas (Parameters & Query) ---

export const PaginationQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  orderBy: t.Optional(t.String({ default: 'order_no' })),
  order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')], { default: 'asc' })),
  tenantId: t.Optional(t.Numeric({ minimum: 1 }))
});

export const BrandIdParamSchema = t.Object({
  id: t.String() // Assuming ID is passed as string in URL and parsed later
});

export const BrandAndLanguageParamsSchema = t.Object({
  id: t.String(), // Assuming ID is passed as string
  languageId: t.Numeric({ minimum: 1 })
});

// Translation-specific schemas
export const BrandTranslationCreateSchema = t.Object({
    language_id: t.Numeric(),
    title: t.String({ minLength: 1 }),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String()))
});

export const BrandTranslationUpdateSchema = t.Object({
    title: t.Optional(t.String({ minLength: 1 })),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String()))
});
