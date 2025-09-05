import { shops } from "../../db/shops.schema";
import { shop_locations, shop_location_phones } from "../../db/shops.schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { t } from 'elysia';

// Base types inferred from schema
export type TShop = InferSelectModel<typeof shops>;
export type TShopInsert = InferInsertModel<typeof shops>;

// Shop Location types
export type TShopLocation = InferSelectModel<typeof shop_locations>;
export type TShopLocationInsert = InferInsertModel<typeof shop_locations>;
export type TShopLocationPhone = InferSelectModel<typeof shop_location_phones>;
export type TShopLocationPhoneInsert = InferInsertModel<typeof shop_location_phones>;

// Enhanced Shop Location types with phone numbers
export type TShopLocationWithPhones = TShopLocation & {
  phones: TShopLocationPhone[];
};

// Operating hours type for better type safety
export type OperatingHours = {
  [key: string]: {
    open: string;
    close: string;
    isClosed: boolean;
  };
};

// Create types for shop locations
export type TShopLocationCreate = {
  shopId: number;
  name: string;
  address: string;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  operatingHours?: OperatingHours | null;
  isActive?: boolean;
  displayOrder?: number;
  phones?: {
    phoneNumber: string;
    phoneType: 'main' | 'mobile' | 'fax' | 'whatsapp';
    isPrimary: boolean;
  }[];
};

export type TShopLocationUpdate = Partial<TShopLocationCreate>;

// Phone number create/update types
export type TShopLocationPhoneCreate = {
  locationId: number;
  phoneNumber: string;
  phoneType: 'main' | 'mobile' | 'fax' | 'whatsapp';
  isPrimary: boolean;
};

export type TShopLocationPhoneUpdate = Partial<TShopLocationPhoneCreate>;

// Shop Create Type
export type TShopCreate = {
  name: string;
  tenant_id: number;
  owner_id: number;
  organization: string;
  phone: string;
  logo?: string | null;
  config?: any | null; // JSON can be 'any' or a more specific type
  active?: boolean | null;
};

// Shop Update Type (all fields optional)
export type TShopUpdate = Partial<TShopCreate>;

// --- Elysia Validation Schemas ---

export const ShopCreateSchema = t.Object({
    name: t.String({ 
        minLength: 1, 
        maxLength: 255,
        error: 'Shop name is required and must be between 1 and 255 characters'
    }),
    tenant_id: t.Numeric({
        minimum: 1,
        error: 'Tenant ID is required and must be a positive number'
    }),
    owner_id: t.Numeric({
        minimum: 1,
        error: 'Owner ID is required and must be a positive number'
    }),
    organization: t.String({ 
        minLength: 1,
        maxLength: 255,
        error: 'Organization name is required and must be between 1 and 255 characters'
    }),
    phone: t.String({ 
        minLength: 1,
        maxLength: 255,
        pattern: '^[+]?[\\s\\-\\(\\)]*([0-9][\\s\\-\\(\\)]*){10,}$',
        error: 'Phone number is required and must be at least 10 digits in a valid format'
    }),
    logo: t.String({ 
        maxLength: 255,
        error: 'Logo URL must be 255 characters or less'
    }),
    config: t.Optional(t.Union([t.Any(), t.Null()])),
    active: t.Optional(t.Boolean({ 
        default: true,
        error: 'Active status must be a boolean value'
    }))
});

// For some reason, if TShopCreate is derived from ShopCreateSchema.static directly,
// it might not perfectly match the manually defined TShopCreate above, especially if there are transformations or defaults.
// Re-defining based on schema static for strictness in what controller/service expects from validated body.
export type TShopCreateValidated = typeof ShopCreateSchema.static;


export const ShopUpdateSchema = t.Partial(ShopCreateSchema);

// export type TShopUpdate = typeof ShopUpdateSchema.static; //This would be ideal.
// Using manual definition to ensure compatibility with the existing TShopUpdate type.
// However, for request body, relying on ShopUpdateSchema.static after validation is safer.
export type TShopUpdateValidated = typeof ShopUpdateSchema.static;


export const FileUploadSchema = t.Object({
  file: t.File({
    type: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/heic', 'image/heif'],
    maxSize: '5m', // 5MB
    error: 'Please upload a valid image file (PNG, JPG, WebP, GIF, or HEIC) up to 5MB in size.'
  })
});

// New schema for updating only the config
export const ShopConfigSchema = t.Object({
    config: t.Any() // Assuming config can be any JSON object. Define a more specific type if known.
});

export type TShopConfigUpdate = typeof ShopConfigSchema.static;

// --- Shop Location Validation Schemas ---

export const ShopLocationPhoneSchema = t.Object({
    phoneNumber: t.String({ minLength: 1, maxLength: 20 }),
    phoneType: t.Enum({ main: 'main', mobile: 'mobile', fax: 'fax', whatsapp: 'whatsapp' }, { default: 'main' }),
    isPrimary: t.Boolean({ default: false })
});

export const OperatingHoursSchema = t.Record(
    t.String(),
    t.Object({
        open: t.String(),
        close: t.String(),
        isClosed: t.Boolean()
    })
);

export const ShopLocationCreateSchema = t.Object({
    shopId: t.Numeric(),
    name: t.String({ minLength: 1, maxLength: 255 }),
    address: t.String({ minLength: 1 }),
    city: t.String({ minLength: 1, maxLength: 100 }),
    state: t.Optional(t.String({ maxLength: 100 })),
    postalCode: t.Optional(t.String({ maxLength: 20 })),
    country: t.String({ minLength: 1, maxLength: 100 }),
    latitude: t.Numeric(),
    longitude: t.Numeric(),
    description: t.Optional(t.Nullable(t.String())),
    operatingHours: t.Optional(OperatingHoursSchema),
    isActive: t.Optional(t.Boolean({ default: true })),
    displayOrder: t.Optional(t.Numeric({ default: 0 })),
    phones: t.Optional(t.Array(ShopLocationPhoneSchema))
});

export const ShopLocationUpdateSchema = t.Partial(ShopLocationCreateSchema);

export const ShopLocationPhoneCreateSchema = t.Object({
    locationId: t.Numeric(),
    phoneNumber: t.String({ minLength: 1, maxLength: 20 }),
    phoneType: t.Enum({ main: 'main', mobile: 'mobile', fax: 'fax', whatsapp: 'whatsapp' }, { default: 'main' }),
    isPrimary: t.Boolean({ default: false })
});

export const ShopLocationPhoneUpdateSchema = t.Partial(ShopLocationPhoneCreateSchema);

// Validated types for request bodies
export type TShopLocationCreateValidated = typeof ShopLocationCreateSchema.static;
export type TShopLocationUpdateValidated = typeof ShopLocationUpdateSchema.static;
export type TShopLocationPhoneCreateValidated = typeof ShopLocationPhoneCreateSchema.static;
export type TShopLocationPhoneUpdateValidated = typeof ShopLocationPhoneUpdateSchema.static; 