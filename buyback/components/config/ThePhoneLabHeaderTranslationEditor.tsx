"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ThePhoneLabHeaderConfig, TranslatableText } from "@/types/shop";
import { aiTranslationService } from "@/lib/api/catalog/aiTranslationService";

interface ThePhoneLabHeaderTranslationEditorProps {
  config: ThePhoneLabHeaderConfig;
  onConfigChange: (config: ThePhoneLabHeaderConfig) => void;
  onSave: () => void;
  onCancel: () => void;
}

const supportedLocales = ['en', 'nl', 'de', 'fr', 'es'];
const localeNames: { [key: string]: string } = {
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español'
};

export function ThePhoneLabHeaderTranslationEditor({ 
  config, 
  onConfigChange, 
  onSave, 
  onCancel 
}: ThePhoneLabHeaderTranslationEditorProps) {
  const [selectedLocale, setSelectedLocale] = useState<string>('en');
  const [isGenerating, setIsGenerating] = useState(false);

  const updateField = (field: keyof ThePhoneLabHeaderConfig, locale: string, value: string) => {
    const fieldValue = config[field] as TranslatableText || {};
    onConfigChange({
      ...config,
      [field]: {
        ...fieldValue,
        [locale]: value
      }
    });
  };

  const generateTranslations = async () => {
    if (!config.benefit1?.en) {
      console.error('English text required for translation');
      return;
    }

    setIsGenerating(true);
    try {
      const textsToTranslate: Record<string, string> = {};
      
      if (config.benefit1?.en) textsToTranslate.benefit1 = config.benefit1.en;
      if (config.benefit2?.en) textsToTranslate.benefit2 = config.benefit2.en;
      if (config.benefit3?.en) textsToTranslate.benefit3 = config.benefit3.en;
      if (config.repairs?.en) textsToTranslate.repairs = config.repairs.en;
      if (config.stores?.en) textsToTranslate.stores = config.stores.en;

      const newConfig = { ...config };

      for (const targetLocale of supportedLocales) {
        if (targetLocale === 'en') continue;

        try {
          const translatedTexts = await aiTranslationService.generateComponentTexts(
            'header',
            'en',
            targetLocale,
            textsToTranslate
          );

          if (translatedTexts) {
            Object.entries(translatedTexts).forEach(([key, translatedText]) => {
              const fieldKey = key as keyof ThePhoneLabHeaderConfig;
              const fieldValue = newConfig[fieldKey] as TranslatableText || {};
              
              newConfig[fieldKey] = {
                ...fieldValue,
                [targetLocale]: translatedText
              } as TranslatableText;
            });
          }
        } catch (error) {
          console.error(`Failed to translate to ${targetLocale}:`, error);
        }
      }

      onConfigChange(newConfig);
    } catch (error) {
      console.error('Translation generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getFieldValue = (field: keyof ThePhoneLabHeaderConfig, locale: string): string => {
    const fieldValue = config[field] as TranslatableText;
    return fieldValue?.[locale] || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">ThePhoneLab Header Translation Editor</h3>
        <Button 
          onClick={generateTranslations} 
          disabled={isGenerating || !config.benefit1?.en}
          variant="outline"
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate All Translations'
          )}
        </Button>
      </div>

      {/* Locale Selector */}
      <div className="flex flex-wrap gap-2">
        {supportedLocales.map((locale) => (
          <Badge 
            key={locale}
            variant={selectedLocale === locale ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedLocale(locale)}
          >
            {localeNames[locale]}
          </Badge>
        ))}
      </div>

      {/* Translation Fields */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Benefits Bar Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="benefit1">Benefit 1 ({localeNames[selectedLocale]})</Label>
              <Input
                id="benefit1"
                value={getFieldValue('benefit1', selectedLocale)}
                onChange={(e) => updateField('benefit1', selectedLocale, e.target.value)}
                placeholder="e.g., Paid immediately"
              />
            </div>
            
            <div>
              <Label htmlFor="benefit2">Benefit 2 ({localeNames[selectedLocale]})</Label>
              <Input
                id="benefit2"
                value={getFieldValue('benefit2', selectedLocale)}
                onChange={(e) => updateField('benefit2', selectedLocale, e.target.value)}
                placeholder="e.g., Sales in 1 of our 12 stores"
              />
            </div>
            
            <div>
              <Label htmlFor="benefit3">Benefit 3 ({localeNames[selectedLocale]})</Label>
              <Input
                id="benefit3"
                value={getFieldValue('benefit3', selectedLocale)}
                onChange={(e) => updateField('benefit3', selectedLocale, e.target.value)}
                placeholder="e.g., No surprises"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Navigation Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="repairs">Repairs ({localeNames[selectedLocale]})</Label>
              <Input
                id="repairs"
                value={getFieldValue('repairs', selectedLocale)}
                onChange={(e) => updateField('repairs', selectedLocale, e.target.value)}
                placeholder="e.g., Repairs"
              />
            </div>
            
            <div>
              <Label htmlFor="stores">Stores ({localeNames[selectedLocale]})</Label>
              <Input
                id="stores"
                value={getFieldValue('stores', selectedLocale)}
                onChange={(e) => updateField('stores', selectedLocale, e.target.value)}
                placeholder="e.g., Stores"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
} 