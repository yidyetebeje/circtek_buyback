'use client';

import { useAtomValue } from 'jotai';
import { currentLanguageObjectAtom } from '@/store/atoms';
import { 
  getTranslatedHeroContent, 
  getLocalizedText, 
  prepareHeroContentForAITranslation,
  applyAITranslationToHero,
  getStaticTranslation
} from '@/utils/heroTranslationUtils';
import { HeroSection, TranslatableText } from '@/types/shop';

/**
 * Hook to get translated hero content based on current language
 * Supports both dynamic translations (from backend) and static translations (from message files)
 */
export const useHeroTranslation = () => {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  
  return {
    getTranslatedHero: (heroSection: HeroSection, useStaticFallbacks: boolean = true) => 
      getTranslatedHeroContent(heroSection, currentLanguage, useStaticFallbacks),
    getLocalizedText: (textInput: TranslatableText | string | undefined) =>
      getLocalizedText(textInput, currentLanguage?.code || 'en'),
    getStaticText: (key: string, params?: Record<string, string | number>) =>
      getStaticTranslation(key, currentLanguage?.code || 'en', params),
    // AI Translation helpers
    prepareForAITranslation: (heroSection: HeroSection) =>
      prepareHeroContentForAITranslation(heroSection),
    applyAITranslation: (heroSection: HeroSection, translatedTexts: Record<string, string>, targetLanguage: string) =>
      applyAITranslationToHero(heroSection, translatedTexts, targetLanguage),
    currentLanguage
  };
};

/**
 * Hook to get translated content for a specific hero section
 * Enhanced with static translation support
 */
export const useHeroTranslationContent = (heroSection: HeroSection, useStaticFallbacks: boolean = true) => {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  
  return getTranslatedHeroContent(heroSection, currentLanguage, useStaticFallbacks);
};

/**
 * Hook for AI Translation functionality
 */
export const useHeroAITranslation = () => {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  
  return {
    translateHeroContent: async (
      heroSection: HeroSection, 
      sourceLanguage: string = 'en', 
      targetLanguage: string = currentLanguage?.code || 'en'
    ) => {
      if (sourceLanguage === targetLanguage) {
        throw new Error('Source and target languages must be different');
      }

      const texts = prepareHeroContentForAITranslation(heroSection);
      
      try {
        // Call the AI translation API
        const response = await fetch('/api/catalog/ai-translation/component', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            componentType: 'hero',
            sourceLanguageCode: sourceLanguage,
            targetLanguageCode: targetLanguage,
            texts: texts
          })
        });

        if (!response.ok) {
          throw new Error(`Translation failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Translation failed');
        }

        // Apply the translated content back to the hero section
        return applyAITranslationToHero(heroSection, result.data.translatedTexts, targetLanguage);
      } catch (error) {
        console.error('Hero AI translation error:', error);
        throw error;
      }
    },
    currentLanguage
  };
}; 