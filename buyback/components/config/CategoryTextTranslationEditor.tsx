"use client";

import { useState, useEffect, useMemo } from 'react';
import { TranslatableText } from '@/types/shop';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Button } from "@/components/ui/button"; 
import { Sparkles, Loader2, Zap, Trash2 } from "lucide-react";
import { toast } from 'sonner';
import { aiTranslationService } from '@/lib/api/catalog/aiTranslationService';

const DEFAULT_LOCALES = ['en', 'nl', 'de', 'es', 'fr', 'pt'];

interface CategoryTextTranslationEditorProps {
  titleConfig: TranslatableText;
  subtitleConfig: TranslatableText;
  onChange: (updatedTitleConfig: TranslatableText, updatedSubtitleConfig: TranslatableText) => void;
  availableLocales?: string[];
}

export function CategoryTextTranslationEditor({
  titleConfig,
  subtitleConfig,
  onChange,
  availableLocales = DEFAULT_LOCALES,
}: CategoryTextTranslationEditorProps) {
  const [localTitleConfig, setLocalTitleConfig] = useState<TranslatableText>(titleConfig || {});
  const [localSubtitleConfig, setLocalSubtitleConfig] = useState<TranslatableText>(subtitleConfig || {});
  const [activeLocale, setActiveLocale] = useState<string>('en');
  const [managedLocales, setManagedLocales] = useState<string[]>(['en']);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiLanguage, setAiLanguage] = useState<string | null>(null);

  // Synchronize local state with props
  useEffect(() => {
    setLocalTitleConfig(titleConfig || {});
    setLocalSubtitleConfig(subtitleConfig || {});
    
    // Update managed locales based on existing data OR ensure at least English is available
    const existingLocales = new Set([
      ...Object.keys(titleConfig || {}),
      ...Object.keys(subtitleConfig || {})
    ]);
    
    // Always include English as the default language
    existingLocales.add('en');
    
    if (existingLocales.size > 0) {
      setManagedLocales(Array.from(existingLocales));
    } else {
      // Fallback: start with English
      setManagedLocales(['en']);
    }
  }, [titleConfig, subtitleConfig]);

  // Get unselected locales
  const unselectedLocales = useMemo(() => {
    return availableLocales.filter(locale => !managedLocales.includes(locale));
  }, [availableLocales, managedLocales]);

  const handleConfigChange = (locale: string, type: 'title' | 'subtitle', value: string) => {
    if (type === 'title') {
      const updatedTitleConfig = { ...localTitleConfig, [locale]: value };
      setLocalTitleConfig(updatedTitleConfig);
      onChange(updatedTitleConfig, localSubtitleConfig);
    } else {
      const updatedSubtitleConfig = { ...localSubtitleConfig, [locale]: value };
      setLocalSubtitleConfig(updatedSubtitleConfig);
      onChange(localTitleConfig, updatedSubtitleConfig);
    }
  };

  const handleRemoveLocale = (locale: string) => {
    if (locale === 'en') {
      toast.error("Cannot remove English (default language)");
      return;
    }
    
    setManagedLocales(prev => prev.filter(l => l !== locale));
    
    // Remove from configs
    const updatedTitleConfig = { ...localTitleConfig };
    const updatedSubtitleConfig = { ...localSubtitleConfig };
    delete updatedTitleConfig[locale];
    delete updatedSubtitleConfig[locale];
    
    setLocalTitleConfig(updatedTitleConfig);
    setLocalSubtitleConfig(updatedSubtitleConfig);
    onChange(updatedTitleConfig, updatedSubtitleConfig);
    
    // Switch to English if removing current active locale
    if (locale === activeLocale) {
      setActiveLocale('en');
    }
    
    toast.success(`${locale.toUpperCase()} language removed`);
  };

  // Generate AI translation for specific language
  const generateAITranslation = async (targetLocale: string) => {
    if (targetLocale === 'en') {
      toast.error("Cannot generate AI translation for English (source language)");
      return;
    }

    const englishTitle = localTitleConfig['en'] || '';
    const englishSubtitle = localSubtitleConfig['en'] || '';

    if (!englishTitle.trim() && !englishSubtitle.trim()) {
      toast.error("Please add English title or subtitle first before generating translations");
      return;
    }

    setIsGeneratingAI(true);
    setAiLanguage(targetLocale);

    try {
      const textsToTranslate: Record<string, string> = {};
      if (englishTitle.trim()) textsToTranslate.title = englishTitle;
      if (englishSubtitle.trim()) textsToTranslate.subtitle = englishSubtitle;

      const translatedTexts = await aiTranslationService.generateComponentTexts(
        'categories',
        'en',
        targetLocale,
        textsToTranslate
      );

      if (translatedTexts) {
        // Update configs with AI-generated translations
        let updatedTitleConfig = { ...localTitleConfig };
        let updatedSubtitleConfig = { ...localSubtitleConfig };
        
        if (translatedTexts.title) {
          updatedTitleConfig = { ...updatedTitleConfig, [targetLocale]: translatedTexts.title };
          setLocalTitleConfig(updatedTitleConfig);
        }
        
        if (translatedTexts.subtitle) {
          updatedSubtitleConfig = { ...updatedSubtitleConfig, [targetLocale]: translatedTexts.subtitle };
          setLocalSubtitleConfig(updatedSubtitleConfig);
        }

        // Call onChange once with both updated configs
        onChange(updatedTitleConfig, updatedSubtitleConfig);

        // Add locale to managed locales if not already there
        if (!managedLocales.includes(targetLocale)) {
          setManagedLocales(prev => [...prev, targetLocale]);
        }
        
        toast.success(`AI translation generated for ${targetLocale.toUpperCase()}!`);
      } else {
        toast.error("Failed to generate AI translation. Please try again.");
      }
    } catch (error) {
      console.error('AI Translation error:', error);
      toast.error("Error generating AI translation. Please check your connection and try again.");
    } finally {
      setIsGeneratingAI(false);
      setAiLanguage(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Section Title & Subtitle Translations</h4>
          <p className="text-sm text-gray-500">
            Manage translations for category section titles and subtitles across different languages.
          </p>
        </div>
      </div>

      {/* AI Translation Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0">
            <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900">AI Translation Available</h4>
            <p className="text-sm text-blue-700 mt-1">
              Use AI to automatically translate section titles and subtitles from English to other languages. 
              Click the AI button next to each language to generate translations.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Active Languages:</span>
          {managedLocales.map(locale => (
            <div 
              key={locale} 
              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                locale === activeLocale 
                  ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveLocale(locale)}
            >
              <span className="uppercase font-medium">{locale}</span>
              {locale === 'en' && <span className="text-xs">(default)</span>}
              {locale !== 'en' && (
                <>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateAITranslation(locale);
                    }}
                    disabled={isGeneratingAI}
                    size="sm"
                    variant="ghost"
                    className="h-auto p-1 hover:bg-blue-200"
                  >
                    {isGeneratingAI && aiLanguage === locale ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveLocale(locale);
                    }}
                    size="sm"
                    variant="ghost"
                    className="h-auto p-1 hover:bg-red-200 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Language Selection Dropdown */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Current Language:</span>
            <Select value={activeLocale} onValueChange={setActiveLocale}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="z-[100001]">
                {managedLocales.map(locale => (
                  <SelectItem key={locale} value={locale}>
                    {locale.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {unselectedLocales.length > 0 && (
            <div className="flex items-center space-x-2">
                             <Select value="" onValueChange={(value) => {
                 if (value && !managedLocales.includes(value)) {
                   setManagedLocales(prev => [...prev, value]);
                   setActiveLocale(value);
                   // Initialize with empty values
                   handleConfigChange(value, 'title', '');
                   handleConfigChange(value, 'subtitle', '');
                 }
               }}>
                 <SelectTrigger className="w-40">
                   <SelectValue placeholder="Add language" />
                 </SelectTrigger>
                 <SelectContent className="z-[100001]">
                   {unselectedLocales.map(locale => (
                     <SelectItem key={locale} value={locale}>
                       {locale.toUpperCase()}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
          )}
        </div>
      </div>

      {activeLocale && managedLocales.includes(activeLocale) ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-lg">
              {activeLocale.toUpperCase()} Content
              {activeLocale === 'en' && <span className="text-sm text-gray-500 ml-2">(Source Language)</span>}
            </h5>
            {activeLocale !== 'en' && (
              <Button
                onClick={() => generateAITranslation(activeLocale)}
                disabled={isGeneratingAI}
                size="sm"
                variant="outline"
                className="flex items-center space-x-2"
              >
                {isGeneratingAI && aiLanguage === activeLocale ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate with AI</span>
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div>
            <label htmlFor={`title-${activeLocale}`} className="block text-sm font-medium text-gray-700 capitalize">
              {activeLocale.toUpperCase()} Title
            </label>
            <input
              type="text"
              id={`title-${activeLocale}`}
              value={localTitleConfig[activeLocale] || ''}
              onChange={(e) => handleConfigChange(activeLocale, 'title', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              placeholder={`Enter title in ${activeLocale.toUpperCase()}`}
            />
          </div>
          <div>
            <label htmlFor={`subtitle-${activeLocale}`} className="block text-sm font-medium text-gray-700 capitalize">
              {activeLocale.toUpperCase()} Subtitle
            </label>
            <input
              type="text"
              id={`subtitle-${activeLocale}`}
              value={localSubtitleConfig[activeLocale] || ''}
              onChange={(e) => handleConfigChange(activeLocale, 'subtitle', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              placeholder={`Enter subtitle in ${activeLocale.toUpperCase()}`}
            />
          </div>
        </div>
      ) : (
        managedLocales.length === 0 && <p className="text-gray-500">No languages added yet. Select a language from the dropdown and click &quot;Add Language&quot;.</p>
      )}
    </div>
  );
}
