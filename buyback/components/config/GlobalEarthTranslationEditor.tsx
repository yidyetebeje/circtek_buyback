"use client";

import { useState, useEffect, useMemo } from 'react';
import { GlobalEarthConfig, TranslatableText } from '@/types/shop';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Button } from "@/components/ui/button"; 
import { Sparkles, Loader2, Zap, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from 'sonner';
import { aiTranslationService } from '@/lib/api/catalog/aiTranslationService';

const DEFAULT_LOCALES = ['en', 'nl', 'de', 'es', 'fr', 'pt'];

interface GlobalEarthTranslationEditorProps {
  globalEarthConfig: GlobalEarthConfig;
  onChange: (updatedConfig: GlobalEarthConfig) => void;
  availableLocales?: string[];
}

export function GlobalEarthTranslationEditor({
  globalEarthConfig,
  onChange,
  availableLocales = DEFAULT_LOCALES,
}: GlobalEarthTranslationEditorProps) {
  const [localConfig, setLocalConfig] = useState<GlobalEarthConfig>(globalEarthConfig || {});
  const [activeLocale, setActiveLocale] = useState<string>('en');
  const [managedLocales, setManagedLocales] = useState<string[]>(['en']);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiLanguage, setAiLanguage] = useState<string | null>(null);

  // Synchronize local state with props
  useEffect(() => {
    setLocalConfig(globalEarthConfig || {});
    
    // Update managed locales based on existing data OR ensure at least English is available
    const existingLocales = new Set<string>();
    
    // Check all translatable global earth fields for existing locales
    Object.entries(globalEarthConfig || {}).forEach(([fieldName, field]) => {
      // Skip non-translatable fields
      if (fieldName === 'imageUrl' || fieldName === 'backgroundColor' || fieldName === 'textColor') {
        return;
      }
      if (field && typeof field === 'object') {
        Object.keys(field).forEach(locale => existingLocales.add(locale));
      }
    });
    
    // Always include English as the default language
    existingLocales.add('en');
    
    if (existingLocales.size > 0) {
      setManagedLocales(Array.from(existingLocales));
    } else {
      // Fallback: start with English
      setManagedLocales(['en']);
    }
  }, [globalEarthConfig]);

  // Get unselected locales
  const unselectedLocales = useMemo(() => {
    return availableLocales.filter(locale => !managedLocales.includes(locale));
  }, [availableLocales, managedLocales]);

  const handleConfigChange = (locale: string, field: keyof GlobalEarthConfig, value: string) => {
    const updatedConfig = { ...localConfig };
    
    if (field === 'imageUrl' || field === 'backgroundColor' || field === 'textColor') {
      // Handle non-translatable string fields
      updatedConfig[field] = value;
    } else {
      // Handle translatable text fields
      if (!updatedConfig[field]) {
        updatedConfig[field] = {};
      }
      (updatedConfig[field] as TranslatableText)[locale] = value;
    }
    
    setLocalConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const handleRemoveLocale = (locale: string) => {
    if (locale === 'en') {
      toast.error("Cannot remove English (default language)");
      return;
    }
    
    setManagedLocales(prev => prev.filter(l => l !== locale));
    
    // Remove from config (only from translatable fields)
    const updatedConfig = { ...localConfig };
    Object.keys(updatedConfig).forEach(field => {
      // Skip non-translatable fields
      if (field === 'imageUrl' || field === 'backgroundColor' || field === 'textColor') {
        return;
      }
      const fieldValue = updatedConfig[field as keyof GlobalEarthConfig];
      if (fieldValue && typeof fieldValue === 'object') {
        delete (fieldValue as TranslatableText)[locale];
      }
    });
    
    setLocalConfig(updatedConfig);
    onChange(updatedConfig);
    
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

    // Get English texts (only from translatable fields)
    const englishTexts: Record<string, string> = {};
    Object.entries(localConfig).forEach(([field, value]) => {
      // Skip non-translatable fields
      if (field === 'imageUrl' || field === 'backgroundColor' || field === 'textColor') {
        return;
      }
      if (value && typeof value === 'object' && value['en']) {
        englishTexts[field] = value['en'];
      }
    });

    if (Object.keys(englishTexts).length === 0) {
      toast.error("Please add English content first before generating translations");
      return;
    }

    setIsGeneratingAI(true);
    setAiLanguage(targetLocale);

    try {
      const translatedTexts = await aiTranslationService.generateComponentTexts(
        'globalEarth',
        'en',
        targetLocale,
        englishTexts
      );

      if (translatedTexts) {
        // Update config with AI-generated translations
        const updatedConfig = { ...localConfig };
        
        Object.entries(translatedTexts).forEach(([field, translation]) => {
          if (!updatedConfig[field as keyof GlobalEarthConfig]) {
            updatedConfig[field as keyof GlobalEarthConfig] = {};
          }
          (updatedConfig[field as keyof GlobalEarthConfig] as TranslatableText)[targetLocale] = translation;
        });

        setLocalConfig(updatedConfig);
        onChange(updatedConfig);

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

  const globalEarthFields: Array<{ key: keyof GlobalEarthConfig; label: string; placeholder: string; isTextarea?: boolean }> = [
    { key: 'heading', label: 'Heading', placeholder: 'e.g., Reduce e-waste, make money with your old device' },
    { key: 'subheading', label: 'Subheading', placeholder: 'e.g., Receive your personalized offer with a few clicks' },
    { key: 'imageAlt', label: 'Image Alt Text', placeholder: 'e.g., Globe Icon' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Global Earth Section Settings</h4>
          <p className="text-sm text-gray-500">
            Manage the image, texts, and translations for the global earth section.
          </p>
        </div>
      </div>

      {/* Image Configuration */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <ImageIcon className="h-5 w-5 text-gray-600" />
          <h5 className="font-medium text-gray-900">Image Configuration</h5>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image URL
          </label>
          <input
            type="text"
            value={localConfig.imageUrl || ''}
            onChange={(e) => handleConfigChange('en', 'imageUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="https://example.com/globe-icon.png"
          />
          <p className="text-xs text-gray-500 mt-1">
            URL of the globe/earth image to display in the section
          </p>
        </div>
      </div>

      {/* Styling Configuration */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <div className="h-5 w-5 text-gray-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 004-4V9a2 2 0 00-2-2z" />
            </svg>
          </div>
          <h5 className="font-medium text-gray-900">Styling Configuration</h5>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Color
            </label>
            <input
              type="text"
              value={localConfig.backgroundColor || ''}
              onChange={(e) => handleConfigChange('en', 'backgroundColor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="#fcfaf8 or transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Color
            </label>
            <input
              type="text"
              value={localConfig.textColor || ''}
              onChange={(e) => handleConfigChange('en', 'textColor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="#374151 or inherit"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Customize the section's background and text colors. Use hex codes, CSS color names, or 'inherit' for default.
        </p>
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
              Use AI to automatically translate global earth content from English to other languages. 
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
                  // Initialize with empty values for translatable fields only
                  globalEarthFields.forEach(field => {
                    if (field.key !== 'imageUrl' && field.key !== 'backgroundColor' && field.key !== 'textColor') {
                      handleConfigChange(value, field.key, '');
                    }
                  });
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
          
          <div className="space-y-4">
            {globalEarthFields.map(field => (
              <div key={field.key}>
                <label htmlFor={`${field.key}-${activeLocale}`} className="block text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                {field.isTextarea ? (
                  <textarea
                    id={`${field.key}-${activeLocale}`}
                    value={(localConfig[field.key] as TranslatableText)?.[activeLocale] || ''}
                    onChange={(e) => handleConfigChange(activeLocale, field.key, e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={field.placeholder}
                    rows={2}
                  />
                ) : (
                  <input
                    type="text"
                    id={`${field.key}-${activeLocale}`}
                    value={(localConfig[field.key] as TranslatableText)?.[activeLocale] || ''}
                    onChange={(e) => handleConfigChange(activeLocale, field.key, e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        managedLocales.length === 0 && <p className="text-gray-500">No languages added yet. Select a language from the dropdown and click &quot;Add Language&quot;.</p>
      )}
    </div>
  );
}