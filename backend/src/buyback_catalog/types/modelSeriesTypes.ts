import { model_series } from "../../db/buyback_catalogue.schema";
import { model_series_translations } from "../../db/shops.schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { t } from 'elysia';

// Base types inferred from schema
export type TModelSeries = InferSelectModel<typeof model_series>;
export type TModelSeriesInsert = InferInsertModel<typeof model_series>;
export type TModelSeriesTranslation = InferSelectModel<typeof model_series_translations>;
export type TModelSeriesTranslationInsert = InferInsertModel<typeof model_series_translations>;

// Basic Translation Type (used in create/update)
export type TModelSeriesTranslationCreate = {
  language_id: number;
  title: string;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
};

// ModelSeries Create Type (includes translations)
export type TModelSeriesCreate = {
  title: string;
  icon_image?: string | null;
  image?: string | null;
  description?: string | null;
  meta_title?: string | null;
  sef_url?: string | null;
  meta_canonical_url?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  order_no?: number | null;
  tenant_id: number;
  translations?: TModelSeriesTranslationCreate[];
};

// ModelSeries Update Type (all fields optional, includes translations)
export type TModelSeriesUpdate = Partial<Omit<TModelSeriesCreate, 'tenant_id'>> // tenant_id usually shouldn't be updated

// --- Elysia Validation Schemas ---

const ModelSeriesTranslationBaseSchema = {
    language_id: t.Numeric(),
    title: t.String({ minLength: 1 }),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String()))
};

// Schema for translations included in ModelSeries create/update
const ModelSeriesTranslationSchema = t.Object(ModelSeriesTranslationBaseSchema);

// Schema for creating a single translation via dedicated endpoint
export const ModelSeriesTranslationCreateSingleSchema = t.Object({
    language_id: t.Numeric(),
    title: t.String({ minLength: 1 }),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String()))
});

// Schema for updating a single translation via dedicated endpoint
export const ModelSeriesTranslationUpdateSingleSchema = t.Object({
    title: t.Optional(t.String({ minLength: 1 })),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String()))
});

export const ModelSeriesCreateSchema = t.Object({
    title: t.String({ minLength: 1 }),
    icon_image: t.Optional(t.Nullable(t.String())),
    image: t.Optional(t.Nullable(t.String())),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    sef_url: t.Optional(t.String()),
    meta_canonical_url: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String())),
    order_no: t.Optional(t.Nullable(t.Numeric())),
    client_id: t.Numeric(),
    translations: t.Optional(t.Array(ModelSeriesTranslationSchema))
});

export const ModelSeriesUpdateSchema = t.Object({
    title: t.Optional(t.String({ minLength: 1 })),
    icon_image: t.Optional(t.Nullable(t.String())),
    image: t.Optional(t.Nullable(t.String())),
    description: t.Optional(t.Nullable(t.String())),
    meta_title: t.Optional(t.Nullable(t.String())),
    sef_url: t.Optional(t.String({ minLength: 1 })),
    meta_canonical_url: t.Optional(t.Nullable(t.String())),
    meta_description: t.Optional(t.Nullable(t.String())),
    meta_keywords: t.Optional(t.Nullable(t.String())),
    order_no: t.Optional(t.Nullable(t.Numeric())),
    // client_id is omitted - typically not updatable via standard PUT
    translations: t.Optional(t.Array(ModelSeriesTranslationSchema))
});

// File upload schema for model series images
export const FileUploadSchema = t.Object({
    file: t.File({
        type: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
        maxSize: 5 * 1024 * 1024 // 5MB
    })
});
