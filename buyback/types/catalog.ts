/**
 * Type definitions for the catalog entities
 * Based on the API schema and aligned with the existing architecture
 */

// Published Shop type
export interface PublishedShop {
  shop_id: number;
}

// Common SEO fields
export interface SeoFields {
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  meta_canonical_url?: string | null;
  sef_url: string;
}

// Base entity with common fields
interface BaseEntity {
  id?: number;
  tenant_id: number;
  order_no?: number | null;
  created_at?: string;
  updated_at?: string;
  publishedInShops?: PublishedShop[];
}

// Device Category
export interface Category extends BaseEntity, SeoFields {
  title: string;
  icon?: string | null;
  description?: string | null;
  usage?: string;
}

// Category Translation
export interface CategoryTranslation {
  category_id: number;
  language_id: number;
  title: string;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  [key: string]: unknown; // Ensure compatibility with base Translation type
}

// Brand
export interface Brand extends BaseEntity, SeoFields {
  title: string;
  icon?: string | null;
  description?: string | null;
}

// Brand Translation
export interface BrandTranslation {
  brand_id: number;
  language_id: number;
  title: string;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  [key: string]: unknown; // Ensure compatibility with base Translation type
}

// Model Series
export interface ModelSeries extends BaseEntity, SeoFields {
  title: string;
  brand_id?: number | null;
  image?: string | null;
  description?: string | null;
}

// Model Series Translation
export interface ModelSeriesTranslation {
  model_series_id: number;
  language_id: number;
  title: string;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  language?: Language;
  [key: string]: unknown; // Ensure compatibility with base Translation type
}

// Price Drops applied when specific tests fail
export interface ModelTestPriceDrop {
  testName: string;
  priceDrop: number;
}

// Device Model
export interface Model extends BaseEntity, SeoFields {
  title: string;
  category_id: number;
  brand_id: number;
  model_series_id?: number | null;
  base_price: number;
  model_image?: string | null;
  description?: string | null;
  specifications?: Record<string, unknown> | null;
  category?: Category;
  brand?: Brand;
  series?: ModelSeries;
  translations?: ModelTranslation[];
  questionSetAssignments?: QuestionSetAssignment[];
  testPriceDrops?: ModelTestPriceDrop[];
}

// Model Translation
export interface ModelTranslation {
  id?: number;
  model_id: number;
  language_id: number;
  title: string;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  specifications?: Record<string, unknown> | null;
  language?: Language;
  [key: string]: unknown;
}

// Language
export interface Language {
  id: number;
  code: string;
  name: string;
  is_active: boolean | number; // API returns 0/1, frontend might use boolean
  is_default: boolean | number; // API returns 0/1, frontend might use boolean
}

// Add the Shop interface
export interface Shop {
  id: number;
  name: string;
  tenant_id: number;
  owner_id: number;
  logo: string | null;
  icon?: string | null;
  organization: string | null;
  config: Record<string, unknown> | null;
  phone: string | null;
  active: boolean | null;
  createdAt: string;
  updatedAt: string;
}

// FAQ Types
export interface FAQ {
  id?: number;
  question: string;
  answer: string;
  order_no?: number;
  is_published?: boolean;
  shop_id: number;
  tenant_id: number;
  created_at?: string;
  updated_at?: string;
  translations?: FAQTranslation[];
}

export interface FAQTranslation {
  id?: number;
  faq_id: number;
  language_id: number;
  question: string;
  answer: string;
  language?: Language;
}

// FAQ API responses
export interface PaginatedFAQsResponse {
  data: FAQ[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// FAQ form values
export interface FAQFormValues {
  id?: number;
  question: string;
  answer: string;
  order_no?: number;
  is_published?: boolean;
  shop_id: number;
  tenant_id: number;
  translations?: {
    language_id: number;
    question: string;
    answer: string;
  }[];
}

// Question Related Types from new API documentation

// Generic Translation Record for nested translations within questions/options
export interface ItemTranslation {
  id?: number;
  language_id: number;
  title?: string;
  description?: string;
  language?: Language;
}

export interface QuestionOption {
  id: number;
  question_id: number;
  key: string;
  title: string;
  price_modifier: number;
  isDefault: boolean;
  orderNo: number;
  translations?: ItemTranslation[];
}

export interface Question {
  id: number;
  question_set_id: number;
  key: string;
  title: string;
  inputType: 'SINGLE_SELECT_RADIO' | 'SINGLE_SELECT_DROPDOWN' | 'MULTI_SELECT_CHECKBOX' | 'TEXT_INPUT' | 'NUMBER_INPUT' | string;
  isRequired: boolean;
  orderNo: number;
  translations?: ItemTranslation[];
  options: QuestionOption[];
}

export interface QuestionSet {
  id: number;
  internalName: string;
  displayName: string;
  description?: string;
  tenant_id: number;
  translations?: ItemTranslation[];
  questions: Question[];
}

export interface QuestionSetAssignment {
  id: number;
  model_id: number;
  question_set_id: number;
  assignmentOrder: number;
  createdAt: string;
  updatedAt: string;
  questionSet: QuestionSet;
}
