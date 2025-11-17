import { CategoryType } from "@/components/homepage/category-variants";
import { CategoryTranslation } from "@/utils/categoryTranslationUtils";

// Interface representing the actual structure of a category from the backend API
export interface ApiCategory {
  id: number;
  title: string;
  icon?: string; // The URL for the category image
  description?: string | null;
  sef_url?: string; // This is the slug for the category
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  meta_canonical_url?: string | null;
  order_no?: number | null;
  tenant_id?: number;
  createdAt?: string;
  updatedAt?: string;
  is_published?: number;
  translations?: CategoryTranslation[];
}

/**
 * Maps a backend API category to the frontend CategoryType format
 */
export function mapApiCategoryToFrontend(apiCategory: ApiCategory): CategoryType {
  return {
    id: apiCategory.id,
    title: apiCategory.title,
    description: apiCategory.description || undefined,
    // Use icon as the imageUrl
    imageUrl: apiCategory.icon,
    translations: apiCategory.translations,
    // Construct link using sef_url (slug) if available, otherwise use id
    link: apiCategory.sef_url 
      ? `/category/${apiCategory.sef_url}/models` 
      : `/category/${apiCategory.id}/models`,
  };
}

/**
 * Maps an array of backend API categories to frontend CategoryType format
 */
export function mapApiCategoriesToFrontend(apiCategories: ApiCategory[]): CategoryType[] {
  return apiCategories.map(mapApiCategoryToFrontend);
} 