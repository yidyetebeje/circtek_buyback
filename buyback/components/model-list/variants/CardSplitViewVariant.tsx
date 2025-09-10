"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModelListItemType, TranslatableText, DesignSystem, ThemeColors } from '@/types/shop';
import { getLocalizedText } from '@/utils/localization';

interface CardSplitViewVariantProps {
  models: ModelListItemType[];
  theme: ThemeColors;
  design?: DesignSystem;
  currentLocale?: string;
  defaultLocale?: string;
}

const resolveText = (textObj: TranslatableText | string | undefined, locale: string, defaultLocale: string): string | undefined => {
  if (typeof textObj === 'string') return textObj;
  if (textObj) return getLocalizedText(textObj, locale, defaultLocale);
  return undefined;
};

export function CardSplitViewVariant({ 
  models, 
  theme, 
  design, 
  currentLocale = 'en', 
  defaultLocale = 'en' 
}: CardSplitViewVariantProps) {
  const router = useRouter();

  if (!models || models.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">No models found.</p>;
  }

  const cardRadius = design?.borderRadius?.card || '0.75rem';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      {models.map((model, index) => {
        const modelName = resolveText(model.name, currentLocale, defaultLocale) || 'Unnamed Model';
        const modelDescription = resolveText(model.description, currentLocale, defaultLocale) || 'Discover more about this model and its features.';
        // Alternate layout for visual rhythm
        const isReversed = index % 2 === 1;

        return (
          <Link
            key={model.id}
            href={`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`}
            className={`split-view-card group flex flex-col md:flex-row bg-white dark:bg-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 ${isReversed ? 'md:flex-row-reverse' : ''}`}
            style={{
              borderRadius: cardRadius,
              borderColor: theme.accent,
              '--card-primary-color': theme.primary,
            } as React.CSSProperties}
            aria-label={`View details for ${modelName}`}
          >
            {/* Image Side */}
            <div className="relative w-full md:w-2/5 h-60 md:h-auto flex-shrink-0">
              {model.imageUrl ? (
                <Image
                  src={model.imageUrl}
                  alt={modelName}
                  layout="fill"
                  objectFit="contain"
                  className="transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
                  No Image
                </div>
              )}
              <div className={`absolute inset-0 bg-gradient-to-t ${isReversed ? 'from-black/50 md:from-transparent md:to-black/30 md:bg-gradient-to-l' : 'from-black/50 md:from-transparent md:to-black/30 md:bg-gradient-to-r'}  opacity-40 group-hover:opacity-60 transition-opacity duration-300`}></div>
            </div>

            {/* Content Side */}
            <div className="relative z-1 flex flex-col flex-grow p-6 space-y-3">
              <h3 
                className="text-xl font-semibold text-gray-800 dark:text-white group-hover:text-[var(--card-primary-color)] transition-colors duration-200"
                title={modelName}
              >
                {modelName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 flex-grow leading-relaxed">
                {modelDescription.substring(0,100)}...
              </p>
              <div className="pt-3">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`);
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ backgroundColor: theme.primary, '--focus-ring-color': theme.accent } as React.CSSProperties}
                >
                  Estimate Value
                  <svg xmlns="http://www.w3.org/2000/svg" className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
              </div>
            </div>
            
            {/* Animated Border (Lines from corners) */}
            <div className="line line-1"></div>
            <div className="line line-2"></div>
            <div className="line line-3"></div>
            <div className="line line-4"></div>

            <style jsx>{`
              .split-view-card .line {
                position: absolute;
                background-color: var(--card-primary-color);
                opacity: 0;
                transition: all 0.4s ease-out;
                z-index: 2;
              }
              .split-view-card:hover .line { opacity: 1; }

              .split-view-card .line-1, .split-view-card .line-3 {
                width: 0%; height: 2px;
              }
              .split-view-card .line-2, .split-view-card .line-4 {
                width: 2px; height: 0%;
              }
              .split-view-card .line-1 { top: 0; left: 0; }
              .split-view-card .line-2 { top: 0; right: 0; }
              .split-view-card .line-3 { bottom: 0; right: 0; }
              .split-view-card .line-4 { bottom: 0; left: 0; }

              .split-view-card:hover .line-1 { width: 100%; transition-delay: 0s; }
              .split-view-card:hover .line-2 { height: 100%; transition-delay: 0.1s; }
              .split-view-card:hover .line-3 { width: 100%; transition-delay: 0.2s; }
              .split-view-card:hover .line-4 { height: 100%; transition-delay: 0.3s; }
              a:focus-visible {
                outline-color: var(--focus-ring-color, ${theme.accent});
              }
            `}</style>
          </Link>
        );
      })}
    </div>
  );
} 