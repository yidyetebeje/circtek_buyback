"use client";

import { useState, useEffect } from 'react';
import { CategoryTextConfig, TranslatableText } from '@/types/shop';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Languages, Zap } from "lucide-react";
import { toast } from 'sonner';
import { aiTranslationService } from '@/lib/api/catalog/aiTranslationService';

interface CategoryButtonTextEditorProps {
  categoryTextConfig: CategoryTextConfig | undefined;
  onChange: (updatedConfig: CategoryTextConfig) => void;
  availableLocales?: string[];
}

const CATEGORY_TEXT_KEYS: Array<{
  key: keyof CategoryTextConfig;
  label: string;
  description?: string;
}> = [
  { key: 'getQuote', label: 'Get Quote', description: 'Button text for getting a quote' },
  { key: 'viewAll', label: 'View All', description: 'Button text for viewing all items' },
  { key: 'viewDevices', label: 'View Devices', description: 'Button text for viewing devices' },
  { key: 'sellDevice', label: 'Sell Device', description: 'Button text for selling a device (use {deviceName} placeholder)' },
  { key: 'sellYourDevice', label: 'Sell Your Device', description: 'General sell device button text' },
  { key: 'browseCategories', label: 'Browse Categories', description: 'Button text for browsing categories' },
  { key: 'discoverDeviceValue', label: 'Discover Device Value', description: 'Button text for discovering device value' },
  { key: 'selectDeviceCategory', label: 'Select Device Category', description: 'Instruction text for selecting a category' },
  { key: 'sellDevicesWithEase', label: 'Sell Devices With Ease', description: 'Marketing text for easy selling' },
  { key: 'scrollThroughDevices', label: 'Scroll Through Devices', description: 'Instruction text for scrolling' },
  { key: 'turnInSellMoney', label: 'Turn In, Sell Money', description: 'Marketing text for the selling process' },
  { key: 'chooseWideRange', label: 'Choose Wide Range', description: 'Text about device selection range' },
  { key: 'chooseFromSelection', label: 'Choose From Selection', description: 'Text about choosing from selection' },
  { key: 'findDeviceType', label: 'Find Device Type', description: 'Header text for finding device type' },
  { key: 'selectDeviceToStart', label: 'Select Device To Start', description: 'Instruction text to start the process' },
  { key: 'viewAllModels', label: 'View All Models', description: 'Button text for viewing all models' },
  { key: 'sellPhones', label: 'Sell Phones', description: 'Button text for selling phones' },
  { key: 'sellTablets', label: 'Sell Tablets', description: 'Button text for selling tablets' },
];

export function CategoryButtonTextEditor({ 
  categoryTextConfig, 
  onChange, 
  availableLocales = ['en', 'nl', 'de', 'es', 'fr', 'pt'] 
}: CategoryButtonTextEditorProps) {
  const [selectedLocale, setSelectedLocale] = useState<string>('en');
  const [localConfig, setLocalConfig] = useState<CategoryTextConfig>(categoryTextConfig || {});
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [aiLanguage, setAiLanguage] = useState<string | null>(null);
  console.log("availableLocales", availableLocales);
  console.log("selectedLocale", selectedLocale);
  
  useEffect(() => {
    setLocalConfig(categoryTextConfig || {});
  }, [categoryTextConfig]);

  const handleTextChange = (textKey: keyof CategoryTextConfig, value: string) => {
    const currentTranslatableText = localConfig[textKey] || {};
    const newTranslatableText: TranslatableText = { 
      ...currentTranslatableText, 
      [selectedLocale]: value 
    };
    
    const updatedConfig = { 
      ...localConfig, 
      [textKey]: newTranslatableText 
    };
    
    setLocalConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const getCurrentValue = (textKey: keyof CategoryTextConfig): string => {
    const translatableText = localConfig[textKey];
    if (typeof translatableText === 'object' && translatableText) {
      return translatableText[selectedLocale] || '';
    }
    return '';
  };

  const getEnglishValue = (textKey: keyof CategoryTextConfig): string => {
    const translatableText = localConfig[textKey];
    if (typeof translatableText === 'object' && translatableText) {
      return translatableText['en'] || '';
    }
    return '';
  };

  const resetToDefaults = () => {
    const emptyConfig: CategoryTextConfig = {};
    setLocalConfig(emptyConfig);
    onChange(emptyConfig);
  };

  // Generate AI translation for current language
  const generateAITranslation = async () => {
    if (selectedLocale === 'en') {
      toast.error("Cannot generate AI translation for English (source language)");
      return;
    }

    // Get English texts to translate
    const englishTexts: Record<string, string> = {};
    let hasEnglishContent = false;

    CATEGORY_TEXT_KEYS.forEach(({ key }) => {
      const englishText = getEnglishValue(key);
      if (englishText.trim()) {
        englishTexts[key] = englishText;
        hasEnglishContent = true;
      }
    });

    if (!hasEnglishContent) {
      toast.error("Please add English text content first before generating translations");
      return;
    }

    setIsGeneratingAI(true);
    setAiLanguage(selectedLocale);

    try {
      const translatedTexts = await aiTranslationService.generateCategoryTextTranslations(
        'en',
        selectedLocale,
        englishTexts
      );

      if (translatedTexts) {
        // Update config with AI-generated translations
        const updatedConfig = { ...localConfig };
        
        Object.entries(translatedTexts).forEach(([key, translatedText]) => {
          const textKey = key as keyof CategoryTextConfig;
          const currentTranslatableText = updatedConfig[textKey] || {};
          updatedConfig[textKey] = {
            ...currentTranslatableText,
            [selectedLocale]: translatedText
          };
        });

        setLocalConfig(updatedConfig);
        onChange(updatedConfig);
        
        toast.success(`AI translation generated for ${selectedLocale.toUpperCase()}!`);
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

  // Generate AI translations for all non-English languages
  const generateBulkAITranslations = async () => {
    const nonEnglishLocales = availableLocales.filter(locale => locale !== 'en');
    
    if (nonEnglishLocales.length === 0) {
      toast.error("No target languages available for bulk translation");
      return;
    }

    // Get English texts to translate
    const englishTexts: Record<string, string> = {};
    let hasEnglishContent = false;

    CATEGORY_TEXT_KEYS.forEach(({ key }) => {
      const englishText = getEnglishValue(key);
      if (englishText.trim()) {
        englishTexts[key] = englishText;
        hasEnglishContent = true;
      }
    });

    if (!hasEnglishContent) {
      toast.error("Please add English text content first before generating translations");
      return;
    }

    setIsGeneratingBulk(true);

    try {
      let successCount = 0;
      let failCount = 0;
      const updatedConfig = { ...localConfig };

      // Process translations for each language
      for (const targetLocale of nonEnglishLocales) {
        try {
          const translatedTexts = await aiTranslationService.generateCategoryTextTranslations(
            'en',
            targetLocale,
            englishTexts
          );

          if (translatedTexts) {
            Object.entries(translatedTexts).forEach(([key, translatedText]) => {
              const textKey = key as keyof CategoryTextConfig;
              const currentTranslatableText = updatedConfig[textKey] || {};
              updatedConfig[textKey] = {
                ...currentTranslatableText,
                [targetLocale]: translatedText
              };
            });
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Translation failed for ${targetLocale}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        setLocalConfig(updatedConfig);
        onChange(updatedConfig);
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`Bulk AI translation completed for ${successCount} languages!`);
      } else if (successCount > 0) {
        toast.warning(`Bulk translation partially completed: ${successCount} succeeded, ${failCount} failed`);
      } else {
        toast.error("Bulk translation failed for all languages");
      }
    } catch (error) {
      console.error('Bulk AI Translation error:', error);
      toast.error("Error during bulk translation. Please try again.");
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Category Button Texts</h3>
          <p className="text-sm text-gray-500">
            Customize button texts and labels for category variants. Leave empty to use default translations.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={generateBulkAITranslations}
            disabled={isGeneratingBulk}
            size="sm"
            variant="outline"
            className="flex items-center space-x-2"
          >
            {isGeneratingBulk ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Languages className="h-4 w-4" />
                <span>Generate All Languages</span>
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetToDefaults}
            className="text-red-600 hover:text-red-700"
          >
            Reset All
          </Button>
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
              Use AI to automatically translate category button texts from English to other languages. 
              The AI will maintain context and ensure culturally appropriate translations while preserving placeholders like {'{deviceName}'}.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Language</label>
          
          {/* Debug info */}
          <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
            <div>Available: {availableLocales.length} languages</div>
            <div>Current: {selectedLocale}</div>
            <div>List: {availableLocales.join(', ')}</div>
          </div>
          
          {/* Shadcn Select */}
          <Select value={selectedLocale} onValueChange={setSelectedLocale}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent className="z-[100001]">
              {availableLocales.map((locale) => (
                <SelectItem key={locale} value={locale}>
                  {locale.toUpperCase()}
                  {locale === 'en' && ' (Source)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Fallback Native Select */}
          <div className="mt-2">
            <label className="block text-xs text-gray-500 mb-1">Fallback (Native):</label>
            <select 
              value={selectedLocale} 
              onChange={(e) => setSelectedLocale(e.target.value)}
              className="w-48 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {availableLocales.map((locale) => (
                <option key={locale} value={locale}>
                  {locale.toUpperCase()}{locale === 'en' && ' (Source)'}
                </option>
              ))}
            </select>
          </div>
          
          <p className="text-xs text-gray-500 mt-1">
            Available languages: {availableLocales.join(', ').toUpperCase()}
          </p>
        </div>

        {selectedLocale !== 'en' && (
          <Button
            onClick={generateAITranslation}
            disabled={isGeneratingAI}
            size="sm"
            variant="outline"
            className="flex items-center space-x-2"
          >
            {isGeneratingAI && aiLanguage === selectedLocale ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Generate {selectedLocale.toUpperCase()} with AI</span>
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {CATEGORY_TEXT_KEYS.map(({ key, label, description }) => (
          <div key={key} className="p-4 border rounded-md bg-gray-50">
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {label}
              </label>
              {description && (
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              )}
            </div>
            <input
              type="text"
              value={getCurrentValue(key)}
              onChange={(e) => handleTextChange(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder={`Enter ${label.toLowerCase()} text for ${selectedLocale.toUpperCase()}`}
            />
            {key === 'sellDevice' && (
              <p className="text-xs text-blue-600 mt-1">
                Use {'{deviceName}'} as a placeholder for the device name
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800">
        <strong>Note:</strong> These custom texts will override the default translations from the message files. 
        Leave fields empty to use the default translations for that language.
      </div>
    </div>
  );
} 