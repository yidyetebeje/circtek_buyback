import { models } from "../../db/buyback_catalogue.schema";
import { translations } from "../../db/i18n.schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { t } from 'elysia';
import { model_translations } from "../../db/shops.schema";

// Base types inferred from schema
export type TModel = InferSelectModel<typeof models>;
export type TModelInsert = InferInsertModel<typeof models>;
export type TModelTranslation = InferSelectModel<typeof model_translations>;
export type TModelTranslationInsert = InferInsertModel<typeof model_translations>;

export type TModelTranslationCreate = {
  language_id: number;
  title: string;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  specifications?: Record<string, unknown> | null;
};

// ---------------- Model Test Price Drops ----------------
export type TModelTestPriceDrop = {
  test_name: string;
  price_drop: number;
};

// Model Create Type (includes translations)
export type TModelCreate = {
  title: string;
  sef_url?: string | null;
  base_price?: number | null;
  searchable_words?: string | null;
  tooltip_of_model?: string | null;
  model_image?: string | null;
  category_id: number;
  brand_id: number;
  model_series_id?: number | null;
  tenant_id: number;
  meta_canonical_url?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  translations?: TModelTranslationCreate[];
  // Price drops applied when specific diagnostic tests fail
  price_drops?: TModelTestPriceDrop[];
};

export type TModelUpdate = Partial<Omit<TModelCreate, 'client_id'>>

// ---------------- Schema Definitions ----------------

const ModelTranslationBaseSchema = {
    language_id: t.Numeric(),
    title: t.String({ minLength: 1 }),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String())),
    specifications: t.Optional(t.Nullable(t.Any()))
};
const ModelTranslationSchema = t.Object(ModelTranslationBaseSchema);
export const ModelTranslationCreateSingleSchema = t.Object({
    language_id: t.Numeric(),
    title: t.String({ minLength: 1 }),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String())),
    specifications: t.Optional(t.Nullable(t.Any()))
});

export const ModelTranslationUpdateSingleSchema = t.Object({
    title: t.Optional(t.String({ minLength: 1 })),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String())),
    specifications: t.Optional(t.Nullable(t.Any()))
});

export const ModelTestPriceDropSchema = t.Object({
    test_name: t.String({ minLength: 1 }),
    price_drop: t.Numeric()
});

export const ModelCreateSchema = t.Object({
    title: t.String({ minLength: 1 }),
    sef_url: t.Optional(t.String()),
    base_price: t.Optional(t.Nullable(t.Numeric())),
    searchable_words: t.Optional(t.Nullable(t.String())),
    tooltip_of_model: t.Optional(t.Nullable(t.String())),
    model_image: t.Optional(t.Nullable(t.String())),
    category_id: t.Numeric(),
    brand_id: t.Numeric(),
    model_series_id: t.Optional(t.Nullable(t.Numeric())),
    meta_canonical_url: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String())),
    translations: t.Optional(t.Array(ModelTranslationSchema)),
    price_drops: t.Optional(t.Array(ModelTestPriceDropSchema))
});

export const ModelUpdateSchema = t.Object({
    title: t.Optional(t.String({ minLength: 1 })),
    sef_url: t.Optional(t.String({ minLength: 1 })),
    base_price: t.Optional(t.Nullable(t.Numeric())),
    searchable_words: t.Optional(t.Nullable(t.String())),
    tooltip_of_model: t.Optional(t.Nullable(t.String())),
    model_image: t.Optional(t.Nullable(t.String())),
    category_id: t.Optional(t.Numeric()),
    brand_id: t.Optional(t.Numeric()),
    model_series_id: t.Optional(t.Nullable(t.Numeric())),
    meta_canonical_url: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String())),
    translations: t.Optional(t.Array(ModelTranslationSchema)),
    price_drops: t.Optional(t.Array(ModelTestPriceDropSchema))
});

// File upload schema for model images
export const FileUploadSchema = t.Object({
    file: t.File({
        type: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
        maxSize: 5 * 1024 * 1024 // 5MB
    })
});
