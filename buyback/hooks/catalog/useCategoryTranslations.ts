'use client';

import { useAtomValue } from 'jotai';
import { currentLanguageObjectAtom } from '@/store/atoms';
import { getTranslatedCategoryContent, CategoryWithTranslations } from '@/utils/categoryTranslationUtils';

/**
 * Hook to get translated category content based on current language
 */
export const useCategoryTranslation = () => {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  
  return {
    getTranslatedCategory: (category: CategoryWithTranslations) => 
      getTranslatedCategoryContent(category, currentLanguage),
    currentLanguage
  };
};

/**
 * Hook to get translated content for a specific category
 */
export const useCategoryTranslationContent = (category: CategoryWithTranslations) => {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  
  return getTranslatedCategoryContent(category, currentLanguage);
}; 