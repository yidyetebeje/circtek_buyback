"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModelListItemType, TranslatableText, DesignSystem, ThemeColors } from '@/types/shop';
import { getLocalizedText } from '@/utils/localization';

interface CardGradientAccentVariantProps {
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

export function CardGradientAccentVariant({ 
  models, 
  theme, 
  design, 
  currentLocale = 'en', 
  defaultLocale = 'en' 
}: CardGradientAccentVariantProps) {
  const router = useRouter();

  if (!models || models.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">No models found.</p>;
  }

  const cardRadius = design?.borderRadius?.card || '0.75rem';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      {models.map((model) => {
        const modelName = resolveText(model.name, currentLocale, defaultLocale) || 'Unnamed Model';

        return (
          <Link
            key={model.id}
            href={`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`}
            className="gradient-accent-card group relative block bg-white dark:bg-gray-800 overflow-hidden transition-all duration-300 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              borderRadius: cardRadius,
              borderColor: theme.accent,
              '--card-primary-color': theme.primary,
              '--card-accent-color': theme.accent,
              '--gradient-start': theme.primary + '1A', // Primary with low opacity
              '--gradient-end': theme.accent + '33' // Accent with medium opacity
            } as React.CSSProperties}
            aria-label={`View details for ${modelName}`}
          >
            <div className="card-content relative z-1 h-full flex flex-col">
              <div className="relative w-full h-52 sm:h-56 md:h-60 overflow-hidden">
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
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(to top, var(--card-primary-color) 0%, transparent 70%)` }}
                ></div>
              </div>

              <div className="p-5 flex flex-col flex-grow bg-gradient-to-br from-white dark:from-gray-800 to-transparent">
                <h3 
                  className="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-[var(--card-primary-color)] transition-colors duration-200 mb-2 truncate"
                  title={modelName}
                >
                  {modelName}
                </h3>
                 {/* Placeholder for price or key detail */}
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">From $XXX</p>
                <div className="mt-auto pt-2">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`);
                    }}
                    className="inline-block px-4 py-2 text-sm font-medium text-white rounded-md transition-all duration-200 ease-in-out group-hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{ backgroundColor: `var(--card-primary-color)`, '--focus-ring-color': theme.accent } as React.CSSProperties}
                  >
                    Estimate Value
                  </button>
                </div>
              </div>
            </div>

            {/* Animated Border Lines - Diagonal Wipe Effect */}
            <span className="border-line border-line-top-left"></span>
            <span className="border-line border-line-bottom-right"></span>
            
            <style jsx>{`
              .gradient-accent-card::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                border-radius: ${cardRadius};
                padding: 2px; /* Thickness of the border */
                background: linear-gradient(135deg, var(--card-primary-color), var(--card-accent-color));
                -webkit-mask: 
                  linear-gradient(#fff 0 0) content-box, 
                  linear-gradient(#fff 0 0);
                -webkit-mask-composite: destination-out; 
                mask-composite: exclude;
                opacity: 0;
                transition: opacity 0.4s ease-in-out;
                z-index: 0;
              }
              .gradient-accent-card:hover::before {
                opacity: 1;
              }
              .card-content {
                 background: white; /* Or dark mode equivalent */
                 border-radius: calc(${cardRadius} - 2px); /* Inner radius for content */
              }
             .dark .card-content {
                background: #1f2937; /* Example: gray-800 */
             }
            `}</style>
          </Link>
        );
      })}
    </div>
  );
} 