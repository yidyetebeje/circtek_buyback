"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { ModelListItemType, TranslatableText, DesignSystem, ThemeColors } from '@/types/shop';
import { getLocalizedText } from '@/utils/localization';
import { currentLanguageObjectAtom } from '@/store/atoms';
import { useTranslations } from 'next-intl';

interface FeaturedModelListVariantProps {
  models: ModelListItemType[];
  theme: ThemeColors;
  design?: DesignSystem;
  currentLocale?: string;
  defaultLocale?: string;
}

// Helper to resolve text that could be a string or TranslatableText
const resolveText = (textObj: TranslatableText | string | undefined, locale: string, defaultLocale: string): string | undefined => {
  if (typeof textObj === 'string') return textObj;
  if (textObj) return getLocalizedText(textObj, locale, defaultLocale);
  return undefined;
};

export function FeaturedModelListVariant({
  models,
  theme,
  currentLocale = 'en',
  defaultLocale = 'en'
}: FeaturedModelListVariantProps) {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  const t = useTranslations('ModelListVariants');

  if (!models || models.length === 0) {
    return <p className="text-center text-gray-500 py-8">{t('noModelsFound')}</p>;
  }

  return (
    <section className="py-12 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: theme.primary }}>
            {t('sellYourDevice')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('chooseFromDevices')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
          {models.map((model) => {
            const modelName = resolveText(model.name, currentLocale, defaultLocale) || t('unnamedModel');
            
            return (
              <Link 
                key={model.id}
                href={`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`}
                className="flex flex-col items-center group"
              >
                <div className="relative w-full aspect-square mb-3 h-40">
                  {model.imageUrl ? (
                    <Image
                      src={model.imageUrl}
                      alt={`${modelName} image`}
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-300 h-4"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
                      <span className="text-gray-400">{t('noImageAvailable')}</span>
                    </div>
                  )}
                </div>
                
                <h3 
                  className="text-base font-bold text-center text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors duration-300 mb-3"
                >
                  {modelName}
                </h3>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
} 