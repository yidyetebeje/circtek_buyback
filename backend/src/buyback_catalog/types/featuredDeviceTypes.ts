import { t } from 'elysia';
import { featured_devices } from "../../db/buyback_catalogue.schema";

// Type for inserting a new featured device (matches table structure, usually without id, createdAt, updatedAt)
export type NewFeaturedDevice = typeof featured_devices.$inferInsert;

// Type for model data when joined with featured device
export type ModelData = {
  id: number;
  title: string;
  brand_id: number;
  model_image: string | null;
  base_price: number | null;
  sef_url: string;
};

// Type for shop data when joined with featured device
export type ShopData = {
  id: number;
  name: string;
  logo: string | null;
  organization: string | null;
  phone: string | null;
};

// Type for a featured device record selected from the DB with joined data
export type FeaturedDevice = typeof featured_devices.$inferSelect & {
  model?: ModelData | null; // Optional nested model data
  shop?: ShopData | null;   // Optional nested shop data
};

// Elysia validation schema for creating a new featured device
export const NewFeaturedDeviceSchema = t.Object({
  modelId: t.Numeric({ error: 'Model ID is required and must be a number.' }),
  shopId: t.Numeric({ error: 'Shop ID is required and must be a number.' }),
  tenantId: t.Optional(t.Numeric()), // Made optional; controller will use user.tenantId if not provided by super-admin
  isPublished: t.Optional(t.Boolean({ default: false }))
});

// Elysia validation schema for updating a featured device
export const UpdateFeaturedDeviceSchema = t.Object({
  isPublished: t.Optional(t.Boolean())
  // Add other fields that can be updated by the admin, e.g.:
  // modelId: t.Optional(t.Numeric()),
  // shopId: t.Optional(t.Numeric()),
});
