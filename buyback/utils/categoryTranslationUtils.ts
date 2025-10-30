import { Language } from '@/store/atoms';

// Type for category translation (based on backend structure)
export interface CategoryTranslation {
  id: number;
  category_id: number;
  language_id: number;
  title?: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  language?: Language;
}

// Type for category with translations (matching backend response)
export interface CategoryWithTranslations {
  id: number;
  title: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  link?: string;
  name?: string; // For backward compatibility
  translations?: CategoryTranslation[];
  [key: string]: unknown; // For other fields
}

/**
 * Get translated content for a category based on current language
 */
export function getTranslatedCategoryContent(
  category: CategoryWithTranslations, 
  currentLanguage: Language | null
): {
  title: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
} {
    console.log('category', category);
    console.log('currentLanguage', currentLanguage);
  // If no current language or no translations, return default content
  if (!currentLanguage || !category.translations || category.translations.length === 0) {
    return {
      title: category.title || category.name || 'Category',
      description: category.description,
    };
  }

  // Find translation for current language
  const translation = category.translations.find(
    (t) => t.language?.code === currentLanguage.code || t.language_id === parseInt(currentLanguage.id)
  );

  // If translation found, use translated content with fallbacks
  if (translation) {
    return {
      title: translation.title || category.title || category.name || 'Category',
      description: translation.description || category.description,
      meta_title: translation.meta_title,
      meta_description: translation.meta_description,
      meta_keywords: translation.meta_keywords,
    };
  }

  // Fallback to default language or original content
  const defaultTranslation = category.translations.find(
    (t) => t.language?.isDefault === true
  );

  if (defaultTranslation) {
    return {
      title: defaultTranslation.title || category.title || category.name || 'Category',
      description: defaultTranslation.description || category.description,
      meta_title: defaultTranslation.meta_title,
      meta_description: defaultTranslation.meta_description,
      meta_keywords: defaultTranslation.meta_keywords,
    };
  }

  // Final fallback to original category content
  return {
    title: category.title || category.name || 'Category',
    description: category.description,
  };
}

/**
 * Get translated title for a category (simplified version)
 */
export function getTranslatedCategoryTitle(
  category: CategoryWithTranslations, 
  currentLanguage: Language | null
): string {
  return getTranslatedCategoryContent(category, currentLanguage).title;
}

/**
 * Get translated description for a category (simplified version)
 */
export function getTranslatedCategoryDescription(
  category: CategoryWithTranslations, 
  currentLanguage: Language | null
): string | undefined {
  return getTranslatedCategoryContent(category, currentLanguage).description;
} 