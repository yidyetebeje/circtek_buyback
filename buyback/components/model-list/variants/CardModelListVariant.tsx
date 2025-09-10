"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { ModelListItemType, TranslatableText, DesignSystem, ThemeColors } from '@/types/shop';
import { getLocalizedText } from '@/utils/localization';
import { currentLanguageObjectAtom } from '@/store/atoms';

interface CardModelListVariantProps {
  models: ModelListItemType[];
  theme: ThemeColors;
  design?: DesignSystem;
  currentLocale?: string; // To assist with translations
  defaultLocale?: string; // Fallback locale
}

// Helper to resolve text that could be a string or TranslatableText
const resolveText = (textObj: TranslatableText | string | undefined, locale: string, defaultLocale: string): string | undefined => {
  if (typeof textObj === 'string') return textObj;
  if (textObj) return getLocalizedText(textObj, locale, defaultLocale);
  return undefined;
};

export function CardModelListVariant({ 
  models, 
  theme, 
  design, 
  currentLocale = 'en', 
  defaultLocale = 'en' 
}: CardModelListVariantProps) {
  const router = useRouter();
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  const t = useTranslations('ModelListVariants');

  if (!models || models.length === 0) {
    return <p className="text-center text-gray-500 py-8">{t('noModelsFound')}</p>;
  }

  const cardRadius = design?.borderRadius?.card || '1rem'; // Default from defaultShopConfig

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      {models.map((model) => {
        const modelName = resolveText(model.name, currentLocale, defaultLocale) || t('unnamedModel');

        return (
          <Link
            key={model.id}
            href={`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`}
            className="card-variant-item block bg-white dark:bg-gray-800 shadow-lg overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 relative"
            style={{
              borderRadius: cardRadius,
              '--card-primary-color': theme.primary,
              '--card-accent-color': theme.accent
            } as React.CSSProperties}
            aria-label={`View details for ${modelName}`}
          >
            <div className="card-content relative w-full h-full z-1">
              <div className="relative w-full h-56 sm:h-64 md:h-72 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                {model.imageUrl ? (
                  <Image
                    src={model.imageUrl}
                    alt={modelName}
                    layout="fill"
                    objectFit="contain"
                    className="transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {t('noImageAvailable')}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              <div className="p-5 text-center transition-all duration-300 group-hover:bg-gray-50 dark:group-hover:bg-gray-700">
                <h3 
                  className="text-lg font-medium truncate transition-colors duration-300 group-hover:text-[var(--card-primary-color)]"
                  title={modelName}
                  style={{ color: theme.text }} 
                >
                  {modelName}
                </h3>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`);
                  }}
                  className="mt-3 inline-block px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ backgroundColor: theme.primary, '--focus-ring-color': theme.accent } as React.CSSProperties}
                >
                  {t('estimateValue')}
                </button>
              </div>
            </div>
            
            {/* Animated borders */}
            <span className="border-line-top"></span>
            <span className="border-line-right"></span>
            <span className="border-line-bottom"></span>
            <span className="border-line-left"></span>
            
            <style jsx>{`
              .card-variant-item {
                position: relative;
              }
              
              .card-variant-item .border-line-top,
              .card-variant-item .border-line-right,
              .card-variant-item .border-line-bottom,
              .card-variant-item .border-line-left {
                position: absolute;
                background-color: var(--card-primary-color);
                transition: transform 0.3s ease;
                z-index: 2;
              }
              
              .card-variant-item .border-line-top,
              .card-variant-item .border-line-bottom {
                height: 2px;
                width: 100%;
                transform: scaleX(0);
              }
              
              .card-variant-item .border-line-right,
              .card-variant-item .border-line-left {
                height: 100%;
                width: 2px;
                transform: scaleY(0);
              }
              
              .card-variant-item .border-line-top {
                top: 0;
                left: 0;
                transform-origin: right;
                transition-delay: 0.3s;
              }
              
              .card-variant-item .border-line-right {
                top: 0;
                right: 0;
                transform-origin: top;
                transition-delay: 0s;
              }
              
              .card-variant-item .border-line-bottom {
                bottom: 0;
                right: 0;
                transform-origin: left;
                transition-delay: 0.3s;
              }
              
              .card-variant-item .border-line-left {
                bottom: 0;
                left: 0;
                transform-origin: bottom;
                transition-delay: 0s;
              }
              
              .card-variant-item:hover .border-line-top,
              .card-variant-item:hover .border-line-bottom {
                transform: scaleX(1);
              }
              
              .card-variant-item:hover .border-line-right,
              .card-variant-item:hover .border-line-left {
                transform: scaleY(1);
              }
              
              .card-variant-item:hover .border-line-top {
                transform-origin: left;
                transition-delay: 0s;
              }
              
              .card-variant-item:hover .border-line-right {
                transform-origin: bottom;
                transition-delay: 0.3s;
              }
              
              .card-variant-item:hover .border-line-bottom {
                transform-origin: right;
                transition-delay: 0s;
              }
              
              .card-variant-item:hover .border-line-left {
                transform-origin: top;
                transition-delay: 0.3s;
              }
              
              /* Style for focus ring color variable */
              a:focus-visible {
                outline-color: var(--focus-ring-color, ${theme.accent}); /* Fallback to accent if var not set */
              }
            `}</style>
          </Link>
        );
      })}
    </div>
  );
} 