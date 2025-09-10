"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModelListItemType, TranslatableText, DesignSystem, ThemeColors } from '@/types/shop';
import { getLocalizedText } from '@/utils/localization';

interface CardClassicElegantVariantProps {
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

export function CardClassicElegantVariant({ 
  models, 
  theme, 
  design, 
  currentLocale = 'en', 
  defaultLocale = 'en' 
}: CardClassicElegantVariantProps) {
  const router = useRouter();

  if (!models || models.length === 0) {
    return <p className="text-center text-gray-500 py-8">No models found in this category.</p>;
  }

  const cardRadius = design?.borderRadius?.card || '1rem';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 p-4">
      {models.map((model) => {
        const modelName = resolveText(model.name, currentLocale, defaultLocale) || 'Unnamed Model';

        return (
          <Link
            key={model.id}
            href={`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`}
            className="elegant-card block bg-white dark:bg-gray-800 overflow-hidden group transition-all duration-300 hover:shadow-xl relative"
            style={{
              borderRadius: cardRadius,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              '--card-primary-color': theme.primary,
              '--card-accent-color': theme.accent
            } as React.CSSProperties}
            aria-label={`View details for ${modelName}`}
          >
            <div className="card-content relative w-full h-full z-1">
              <div className="relative w-full h-56 sm:h-64 md:h-72 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                {model.imageUrl ? (
                  <Image
                    src={model.imageUrl}
                    alt={modelName}
                    layout="fill"
                    objectFit="contain"
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                
                {/* Elegant overlay with shine effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Price tag badge (if model has base_price) */}
                {model.base_price && (
                  <div 
                    className="absolute top-4 right-4 py-1 px-3 rounded-full text-white text-sm font-medium z-10 shadow-lg backdrop-blur-sm"
                    style={{ backgroundColor: `${theme.primary}cc` }}
                  >
                    €{model.base_price}
                  </div>
                )}
              </div>

              <div className="p-5 text-center bg-white dark:bg-gray-800 transition-all duration-300">
                <h3 
                  className="text-lg font-semibold mb-2 truncate"
                  title={modelName}
                  style={{ color: theme.text }} 
                >
                  {modelName}
                </h3>
                
                {/* Elegant separator line */}
                <div 
                  className="w-16 h-0.5 mx-auto my-3 transition-all duration-300 group-hover:w-24"
                  style={{ backgroundColor: theme.primary }}
                ></div>
                
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`);
                  }}
                  className="mt-3 inline-block px-6 py-2 text-sm font-medium text-white rounded-md transition-all duration-200 ease-in-out transform group-hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ 
                    backgroundColor: theme.primary,
                    '--focus-ring-color': theme.accent 
                  } as React.CSSProperties}
                >
                  Estimate Value
                </button>
              </div>
            </div>
            
            {/* Elegant corner accents */}
            <div className="elegant-corner top-0 left-0"></div>
            <div className="elegant-corner top-0 right-0"></div>
            <div className="elegant-corner bottom-0 left-0"></div>
            <div className="elegant-corner bottom-0 right-0"></div>
            
            <style jsx>{`
              .elegant-card {
                position: relative;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
              }
              
              .elegant-card:hover {
                transform: translateY(-5px);
              }
              
              .elegant-corner {
                position: absolute;
                width: 15px;
                height: 15px;
                border-color: var(--card-primary-color);
                opacity: 0;
                transition: opacity 0.3s ease, width 0.3s ease, height 0.3s ease;
                z-index: 2;
              }
              
              .elegant-card:hover .elegant-corner {
                opacity: 1;
              }
              
              .elegant-corner.top-0.left-0 {
                border-top: 2px solid;
                border-left: 2px solid;
                border-top-left-radius: calc(${cardRadius} / 2);
              }
              
              .elegant-corner.top-0.right-0 {
                border-top: 2px solid;
                border-right: 2px solid;
                border-top-right-radius: calc(${cardRadius} / 2);
              }
              
              .elegant-corner.bottom-0.left-0 {
                border-bottom: 2px solid;
                border-left: 2px solid;
                border-bottom-left-radius: calc(${cardRadius} / 2);
              }
              
              .elegant-corner.bottom-0.right-0 {
                border-bottom: 2px solid;
                border-right: 2px solid;
                border-bottom-right-radius: calc(${cardRadius} / 2);
              }
              
              .elegant-card:hover .elegant-corner {
                width: 25px;
                height: 25px;
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
