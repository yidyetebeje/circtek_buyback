"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModelListItemType, TranslatableText, DesignSystem, ThemeColors } from '@/types/shop';
import { getLocalizedText } from '@/utils/localization';

interface CardMinimalistVariantProps {
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

export function CardMinimalistVariant({ 
  models, 
  theme, 
  design, 
  currentLocale = 'en', 
  defaultLocale = 'en' 
}: CardMinimalistVariantProps) {
  const router = useRouter();

  if (!models || models.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">No models found.</p>;
  }

  const cardRadius = design?.borderRadius?.card || '0.5rem'; // Softer radius for minimalist look

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8 p-4">
      {models.map((model) => {
        const modelName = resolveText(model.name, currentLocale, defaultLocale) || 'Unnamed Model';
        // Assuming a placeholder or a way to get a brief description if available
        const modelDescription = resolveText(model.description, currentLocale, defaultLocale)?.substring(0, 60) + '...' || 'View details for this model.';

        return (
          <Link
            key={model.id}
            href={`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`}
            className="minimalist-card-item group relative flex flex-col bg-white dark:bg-gray-800/50 transition-shadow duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            style={{
              borderRadius: cardRadius,
              borderColor: theme.accent, // For focus ring
              '--card-primary-color': theme.primary,
            } as React.CSSProperties}
            aria-label={`View details for ${modelName}`}
          >
            <div className="card-content relative z-1 flex flex-col h-full">
              <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-700/50 overflow-hidden" style={{ borderRadius: `${cardRadius} ${cardRadius} 0 0`}}>
                {model.imageUrl ? (
                  <Image
                    src={model.imageUrl}
                    alt={modelName}
                    layout="fill"
                    objectFit="contain"
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    No Image
                  </div>
                )}
              </div>

              <div className="flex flex-col flex-grow p-5 space-y-3 border-x border-b border-gray-200 dark:border-gray-700/80" style={{ borderRadius: `0 0 ${cardRadius} ${cardRadius}`}}>
                <h3 
                  className="text-md font-semibold text-gray-800 dark:text-gray-100 group-hover:text-[var(--card-primary-color)] transition-colors duration-200"
                  title={modelName}
                >
                  {modelName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex-grow">
                  {modelDescription}
                </p>
                <div className="pt-2">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`);
                    }}
                    className="inline-block px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{ backgroundColor: theme.primary, '--focus-ring-color': theme.accent } as React.CSSProperties}
                  >
                    Estimate Value
                  </button>
                </div>
              </div>
            </div>
            
            {/* Animated borders (subtle version) */}
            <span className="border-line-top"></span>
            <span className="border-line-right"></span>
            <span className="border-line-bottom"></span>
            <span className="border-line-left"></span>
            
            <style jsx>{`
              .minimalist-card-item {
                box-shadow: 0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px 0 rgba(0,0,0,0.03); /* Subtle initial shadow */
                border: 1px solid transparent; /* Prepare for border animation */
              }
              .minimalist-card-item:hover {
                 border-color: transparent; /* Keep transparent unless animation changes it */
              }
              
              .minimalist-card-item .border-line-top,
              .minimalist-card-item .border-line-right,
              .minimalist-card-item .border-line-bottom,
              .minimalist-card-item .border-line-left {
                position: absolute;
                background-color: var(--card-primary-color);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 0; /* Behind content but above background */
                opacity: 0;
              }

              .minimalist-card-item:hover .border-line-top,
              .minimalist-card-item:hover .border-line-right,
              .minimalist-card-item:hover .border-line-bottom,
              .minimalist-card-item:hover .border-line-left {
                opacity: 1;
              }
              
              .minimalist-card-item .border-line-top,
              .minimalist-card-item .border-line-bottom {
                height: 2px;
                width: 100%;
                transform: scaleX(0);
              }
              
              .minimalist-card-item .border-line-right,
              .minimalist-card-item .border-line-left {
                height: 100%;
                width: 2px;
                transform: scaleY(0);
              }
              
              /* Animation sequence on hover */
              .minimalist-card-item .border-line-top { top: 0; left: 0; transform-origin: left; }
              .minimalist-card-item:hover .border-line-top { transform: scaleX(1); transition-delay: 0s; }
              
              .minimalist-card-item .border-line-right { top: 0; right: 0; transform-origin: top; }
              .minimalist-card-item:hover .border-line-right { transform: scaleY(1); transition-delay: 0.1s; }
              
              .minimalist-card-item .border-line-bottom { bottom: 0; right: 0; transform-origin: right; }
              .minimalist-card-item:hover .border-line-bottom { transform: scaleX(1); transition-delay: 0.2s; }
              
              .minimalist-card-item .border-line-left { bottom: 0; left: 0; transform-origin: bottom; }
              .minimalist-card-item:hover .border-line-left { transform: scaleY(1); transition-delay: 0.3s; }
              /* Style for focus ring color variable */
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