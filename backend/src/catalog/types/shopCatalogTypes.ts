import { t } from 'elysia';

// Common schema for relationship status
export const EntityPublishStatusSchema = t.Object({
  is_published: t.Boolean()
});

// Schema for single entity publish/unpublish
export const SingleEntityPublishSchema = t.Object({
  entityId: t.Number(),
  shopId: t.Number(),
  is_published: t.Boolean()
});

// Schema for publishing a single entity to multiple shops
export const MultipleShopsEntityPublishSchema = t.Object({
  entityId: t.Number(),
  shopIds: t.Array(t.Number()),
  is_published: t.Boolean()
});

// Schema for bulk publish/unpublish operations
export const BulkPublishSchema = t.Object({
  entityIds: t.Array(t.Number()),
  shopId: t.Number(),
  is_published: t.Boolean()
});

// Schema for bulk publishing multiple entities to multiple shops
export const BulkPublishToMultipleShopsSchema = t.Object({
  entityIds: t.Array(t.Number()),
  shopIds: t.Array(t.Number()),
  is_published: t.Boolean()
});

// Schema for retrieving status
export const ShopCatalogStatusQuerySchema = t.Object({
  shopId: t.Number(),
  entityIds: t.Optional(t.Array(t.Number()))
});

// TypeScript types derived from schemas
export type TEntityPublishStatus = {
  is_published: boolean;
};

export type TSingleEntityPublish = {
  entityId: number;
  shopId: number;
  is_published: boolean;
};

export type TMultipleShopsEntityPublish = {
  entityId: number;
  shopIds: number[];
  is_published: boolean;
};

export type TBulkPublish = {
  entityIds: number[];
  shopId: number;
  is_published: boolean;
};

export type TBulkPublishToMultipleShops = {
  entityIds: number[];
  shopIds: number[];
  is_published: boolean;
};

export type TShopCatalogStatusQuery = {
  shopId: number;
  entityIds?: number[];
};

// Database types
export type TShopBrandInsert = {
  shop_id: number;
  brand_id: number;
  is_published: number;
  createdAt?: string;
  updatedAt?: string;
};

export type TShopCategoryInsert = {
  shop_id: number;
  category_id: number;
  is_published: number;
  createdAt?: string;
  updatedAt?: string;
};

export type TShopModelSeriesInsert = {
  shop_id: number;
  series_id: number;
  is_published: number;
  createdAt?: string;
  updatedAt?: string;
};

export type TShopModelInsert = {
  shop_id: number;
  model_id: number;
  is_published: number;
  base_price?: number;
  createdAt?: string;
  updatedAt?: string;
};

// New types for price management
export type TShopModelPriceUpdate = {
  shop_id: number;
  model_id: number;
  base_price: number;
};

export type TBulkPriceUpdate = {
  shop_id: number;
  model_ids: number[];
  base_price: number;
};

// Schema for single model price update
export const ShopModelPriceUpdateSchema = t.Object({
  shopId: t.Number(),
  modelId: t.Number(),
  basePrice: t.Number()
});

// Schema for bulk price update
export const BulkPriceUpdateSchema = t.Object({
  shopId: t.Number(),
  modelIds: t.Array(t.Number()),
  basePrice: t.Number()
});

// Response types
export type TEntityStatusResponse = {
  entityId: number;
  shopId: number;
  is_published: boolean;
};

// Enhanced model status response that includes pricing information
export type TModelStatusResponse = {
  entityId: number;
  shopId: number;
  is_published: boolean;
  base_price?: number;
  model?: {
    id: number;
    title: string;
  };
};

export type TBulkStatusResponse = {
  successful: TEntityStatusResponse[];
  failed: { entityId: number; error: string }[];
}; 