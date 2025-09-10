"use client";

import { useState, useEffect, useMemo } from 'react';
import { HelpConfig, TranslatableText } from '@/types/shop';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Button } from "@/components/ui/button"; 
import { Sparkles, Loader2, Zap, Trash2 } from "lucide-react";
import { toast } from 'sonner';
import { aiTranslationService } from '@/lib/api/catalog/aiTranslationService';

const DEFAULT_LOCALES = ['en', 'nl', 'de', 'es', 'fr', 'pt'];

interface HelpTranslationEditorProps {
  helpConfig: HelpConfig;
  onChange: (updatedConfig: HelpConfig) => void;
  availableLocales?: string[];
}

export function HelpTranslationEditor({
  helpConfig,
  onChange,
  availableLocales = DEFAULT_LOCALES,
}: HelpTranslationEditorProps) {
  const [localConfig, setLocalConfig] = useState<HelpConfig>(helpConfig || {});
  const [activeLocale, setActiveLocale] = useState<string>('en');
  const [managedLocales, setManagedLocales] = useState<string[]>(['en']);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiLanguage, setAiLanguage] = useState<string | null>(null);

  // Synchronize local state with props
  useEffect(() => {
    setLocalConfig(helpConfig || {});
    
    // Update managed locales based on existing data OR ensure at least English is available
    const existingLocales = new Set<string>();
    
    // Check all help fields for existing locales
    Object.values(helpConfig || {}).forEach(field => {
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
  }, [helpConfig]);

  // Get unselected locales
  const unselectedLocales = useMemo(() => {
    return availableLocales.filter(locale => !managedLocales.includes(locale));
  }, [availableLocales, managedLocales]);

  const handleConfigChange = (locale: string, field: keyof HelpConfig, value: string) => {
    const updatedConfig = { ...localConfig };
    
    if (!updatedConfig[field]) {
      updatedConfig[field] = {};
    }
    
    (updatedConfig[field] as TranslatableText)[locale] = value;
    
    setLocalConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const handleRemoveLocale = (locale: string) => {
    if (locale === 'en') {
      toast.error("Cannot remove English (default language)");
      return;
    }
    
    setManagedLocales(prev => prev.filter(l => l !== locale));
    
    // Remove from config
    const updatedConfig = { ...localConfig };
    Object.keys(updatedConfig).forEach(field => {
      const fieldValue = updatedConfig[field as keyof HelpConfig];
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

    // Get English texts
    const englishTexts: Record<string, string> = {};
    Object.entries(localConfig).forEach(([field, value]) => {
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
        'footer',
        'en',
        targetLocale,
        englishTexts
      );

      if (translatedTexts) {
        // Update config with AI-generated translations
        const updatedConfig = { ...localConfig };
        
        Object.entries(translatedTexts).forEach(([field, translation]) => {
          if (!updatedConfig[field as keyof HelpConfig]) {
            updatedConfig[field as keyof HelpConfig] = {};
          }
          (updatedConfig[field as keyof HelpConfig] as TranslatableText)[targetLocale] = translation;
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

  const helpFields: Array<{ key: keyof HelpConfig; label: string; placeholder: string }> = [
    { key: 'title', label: 'Section Title', placeholder: 'e.g., Need help?' },
    { key: 'subtitle', label: 'Section Subtitle', placeholder: 'e.g., Get in touch with one of our specialists' },
    { key: 'whatsapp', label: 'WhatsApp Label', placeholder: 'e.g., Whatsapp' },
    { key: 'email', label: 'Email Label', placeholder: 'e.g., Email' },
    { key: 'stores', label: 'Stores Label', placeholder: 'e.g., 13 stores' },
    { key: 'comeVisit', label: 'Visit Message', placeholder: 'e.g., Feel free to visit' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Help Section Translations</h4>
          <p className="text-sm text-gray-500">
            Manage translations for help section content across different languages.
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
              Use AI to automatically translate help section content from English to other languages. 
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
                  // Initialize with empty values for all fields
                  helpFields.forEach(field => {
                    handleConfigChange(value, field.key, '');
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
            {helpFields.map(field => (
              <div key={field.key}>
                <label htmlFor={`${field.key}-${activeLocale}`} className="block text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                {field.key === 'subtitle' ? (
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