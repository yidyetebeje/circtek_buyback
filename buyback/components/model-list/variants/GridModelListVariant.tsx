"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModelListItemType, TranslatableText, DesignSystem, ThemeColors } from '@/types/shop';
import { getLocalizedText } from '@/utils/localization'; // Assuming getLocalizedText is available

interface GridModelListVariantProps {
  models: ModelListItemType[];
  theme: ThemeColors;
  design?: DesignSystem;
  currentLocale?: string;
  defaultLocale?: string;
}

// Helper (can be shared or redefined)
const resolveText = (textObj: TranslatableText | string | undefined, locale: string, defaultLocale: string): string | undefined => {
  if (typeof textObj === 'string') return textObj;
  if (textObj) return getLocalizedText(textObj, locale, defaultLocale);
  return undefined;
};

export function GridModelListVariant({ 
  models, 
  theme, 
  design, 
  currentLocale = 'en', 
  defaultLocale = 'en' 
}: GridModelListVariantProps) {
  const router = useRouter();

  if (!models || models.length === 0) {
    return <p className="text-center text-gray-500 py-8">No models found in this category.</p>;
  }

  // Use card radius for consistency, or define a specific grid item radius
  const itemRadius = design?.borderRadius?.card || '1rem'; 

  return (
    // Adjust grid columns for denser layout
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
      {models.map((model) => {
        const modelName = resolveText(model.name, currentLocale, defaultLocale) || 'Unnamed Model';

        return (
          <Link
            key={model.id}
            href={`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`}
            className="grid-variant-item group relative block bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden transition-all duration-300 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              borderRadius: itemRadius,
              '--grid-primary-color': theme.primary,
              '--grid-accent-color': theme.accent
            } as React.CSSProperties}
            aria-label={`View details for ${modelName}`}
          >
            <div className="grid-content relative w-full h-full z-1">
              {/* Smaller image height for grid */}
              <div className="relative w-full h-40 sm:h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                {model.imageUrl ? (
                  <Image
                    src={model.imageUrl}
                    alt={modelName}
                    layout="fill"
                    objectFit="contain"
                    className="transition-all duration-300 group-hover:scale-105 group-hover:brightness-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No Image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </div>

              {/* Smaller padding and text */}
              <div className="p-3 text-center bg-white dark:bg-gray-800 transition-all duration-200 group-hover:bg-gray-50 dark:group-hover:bg-gray-700">
                <h3 
                  className="text-sm sm:text-md font-medium truncate transition-colors duration-200 group-hover:text-[var(--grid-primary-color)]"
                  title={modelName}
                  style={{ color: theme.text }} 
                >
                  {modelName}
                </h3>
                {/* Changed Link to button */}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`);
                  }}
                  className="mt-2 inline-block px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ backgroundColor: theme.primary, '--focus-ring-color': theme.accent } as React.CSSProperties}
                >
                  Estimate Value
                </button>
              </div>
            </div>
            
            {/* Animated borders */}
            <span className="border-line-top"></span>
            <span className="border-line-right"></span>
            <span className="border-line-bottom"></span>
            <span className="border-line-left"></span>
            
            <style jsx>{`
              .grid-variant-item {
                position: relative;
              }
              
              .grid-variant-item .border-line-top,
              .grid-variant-item .border-line-right,
              .grid-variant-item .border-line-bottom,
              .grid-variant-item .border-line-left {
                position: absolute;
                background-color: var(--grid-primary-color);
                z-index: 2;
                opacity: 0;
                transition: opacity 0.2s ease, transform 0.3s ease;
              }
              
              .grid-variant-item .border-line-top,
              .grid-variant-item .border-line-bottom {
                height: 2px;
                width: 100%;
                left: 0;
                transform: scaleX(0);
              }
              
              .grid-variant-item .border-line-right,
              .grid-variant-item .border-line-left {
                height: 100%;
                width: 2px;
                top: 0;
                transform: scaleY(0);
              }
              
              .grid-variant-item .border-line-top {
                top: 0;
                transform-origin: center left;
              }
              
              .grid-variant-item .border-line-right {
                right: 0;
                transform-origin: top center;
              }
              
              .grid-variant-item .border-line-bottom {
                bottom: 0;
                transform-origin: center right;
              }
              
              .grid-variant-item .border-line-left {
                left: 0;
                transform-origin: bottom center;
              }
              
              /* Sequential animation on hover */
              .grid-variant-item:hover .border-line-top,
              .grid-variant-item:hover .border-line-right,
              .grid-variant-item:hover .border-line-bottom,
              .grid-variant-item:hover .border-line-left {
                opacity: 1;
              }
              
              .grid-variant-item:hover .border-line-top {
                transform: scaleX(1);
                transition-delay: 0s;
              }
              
              .grid-variant-item:hover .border-line-right {
                transform: scaleY(1);
                transition-delay: 0.1s;
              }
              
              .grid-variant-item:hover .border-line-bottom {
                transform: scaleX(1);
                transition-delay: 0.2s;
              }
              
              .grid-variant-item:hover .border-line-left {
                transform: scaleY(1);
                transition-delay: 0.3s;
              }
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