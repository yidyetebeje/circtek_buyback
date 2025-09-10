"use client";

import { useState } from 'react';
import { HeroSection } from '@/types/shop';
import { useHeroAITranslation } from '@/hooks/catalog/useHeroTranslations';

// Define the structure of a hero translation
type HeroTranslation = {
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  tagline?: string;
  trustBadge?: string;
  liveBadgeText?: string;
  taglineBefore?: string;
  [key: string]: string | undefined; // Index signature to allow dynamic property access
};

interface HeroTranslationEditorProps {
  heroSection: HeroSection;
  onChange: (translations: HeroSection['translations']) => void;
  locales: string[];
}

export function HeroTranslationEditor({ 
  heroSection, 
  onChange, 
  locales = ['en', 'nl', 'de', 'es', 'fr', 'pt'] 
}: HeroTranslationEditorProps) {
  const [activeLocale, setActiveLocale] = useState<string>(locales[0]);
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});
  const { translateHeroContent } = useHeroAITranslation();
  
  const translations = heroSection.translations || {};
  const currentTranslation = (translations[activeLocale] || {}) as HeroTranslation;
  
  const handleTranslationChange = (field: string, value: string) => {
    const updatedTranslations = {
      ...translations,
      [activeLocale]: {
        ...currentTranslation,
        [field]: value
      }
    };
    
    onChange(updatedTranslations);
  };

  const handleAITranslate = async (targetLocale: string) => {
    if (targetLocale === 'en') return; // Don't translate to English as it's the source
    
    setIsTranslating(prev => ({ ...prev, [targetLocale]: true }));
    
    try {
      const translatedHero = await translateHeroContent(heroSection, 'en', targetLocale);
      onChange(translatedHero.translations || {});
    } catch (error) {
      console.error('AI translation failed:', error);
      // You could add a toast notification here
    } finally {
      setIsTranslating(prev => ({ ...prev, [targetLocale]: false }));
    }
  };
  
  // Get fields to translate based on hero variant
  const getFieldsForVariant = (): {name: string; label: string}[] => {
    // Base fields for all variants
    const baseFields = [
      {name: 'title', label: 'Title'},
      {name: 'subtitle', label: 'Subtitle'},
      {name: 'description', label: 'Description'},
      {name: 'buttonText', label: 'Button Text'}
    ];
    
    // Add variant-specific fields
    const variantFields = [];
    
    switch(heroSection.variant) {
      case 'default':
        variantFields.push({name: 'tagline', label: 'Tagline (above title)'});
        break;
      case 'split':
        // No specific text fields beyond the base ones
        break;
      case 'centered':
        variantFields.push({name: 'trustBadge', label: 'Trust Badge Text'});
        break;
      case 'gradient':
        // No specific text fields beyond the base ones
        break;
      case 'minimalist':
        variantFields.push({name: 'taglineBefore', label: 'Tagline (above title)'});
        break;
      case 'video':
        variantFields.push({name: 'liveBadgeText', label: 'Live Badge Text'});
        break;
    }
    
    return [...baseFields, ...variantFields];
  };
  
  const fields = getFieldsForVariant();
  
  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b">
        {locales.map(locale => (
          <div key={locale} className="flex items-center">
            <button
              onClick={() => setActiveLocale(locale)}
              className={`px-3 py-2 text-sm ${
                activeLocale === locale 
                  ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {locale.toUpperCase()}
            </button>
            {locale !== 'en' && (
              <button
                onClick={() => handleAITranslate(locale)}
                disabled={isTranslating[locale]}
                className="ml-2 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title={`AI translate to ${locale.toUpperCase()}`}
              >
                {isTranslating[locale] ? (
                  <>
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Translating...
                  </>
                ) : (
                  <>
                    🤖 AI Translate
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {activeLocale !== 'en' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-700">
                📝 Translating to <strong>{activeLocale.toUpperCase()}</strong>
              </span>
            </div>
            <button
              onClick={() => handleAITranslate(activeLocale)}
              disabled={isTranslating[activeLocale]}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isTranslating[activeLocale] ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  🤖 Generate All Translations
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium mb-1">{field.label}</label>
            {field.name === 'description' ? (
              <textarea
                value={currentTranslation[field.name] || ''}
                onChange={(e) => handleTranslationChange(field.name, e.target.value)}
                placeholder={heroSection[field.name as keyof HeroSection] as string || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            ) : (
              <input
                type="text"
                value={currentTranslation[field.name] || ''}
                onChange={(e) => handleTranslationChange(field.name, e.target.value)}
                placeholder={heroSection[field.name as keyof HeroSection] as string || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            )}
            <p className="text-xs text-gray-500 mt-1">
              Default: {heroSection[field.name as keyof HeroSection] as string || 'Not set'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
