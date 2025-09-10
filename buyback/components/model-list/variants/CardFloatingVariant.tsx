"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModelListItemType, TranslatableText, DesignSystem, ThemeColors } from '@/types/shop';
import { getLocalizedText } from '@/utils/localization';

interface CardFloatingVariantProps {
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

export function CardFloatingVariant({ 
  models, 
  theme, 
  design, 
  currentLocale = 'en', 
  defaultLocale = 'en' 
}: CardFloatingVariantProps) {
  const router = useRouter();

  if (!models || models.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">No models found.</p>;
  }

  const cardRadius = design?.borderRadius?.card || '0.75rem';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 p-4">
      {models.map((model) => {
        const modelName = resolveText(model.name, currentLocale, defaultLocale) || 'Unnamed Model';
        const modelPrice = "Contact for Price"; // Placeholder for price

        return (
          <Link
            key={model.id}
            href={`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`}
            className="floating-card group relative bg-white dark:bg-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            style={{
              borderRadius: cardRadius,
              borderColor: theme.accent,
              '--card-primary-color': theme.primary,
              '--card-accent-color': theme.accent
            } as React.CSSProperties}
            aria-label={`View details for ${modelName}`}
          >
            <div className="relative z-1 h-full flex flex-col overflow-hidden" style={{ borderRadius: cardRadius}}>
              <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 transition-colors duration-200">
                {model.imageUrl ? (
                  <Image
                    src={model.imageUrl}
                    alt={modelName}
                    layout="fill"
                    objectFit="contain" // Changed to contain for a "floating product" look
                    className="p-4 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-1"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    No Image
                  </div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-grow items-center text-center">
                <h3 
                  className="text-lg font-semibold text-gray-800 dark:text-white mb-1 truncate w-full"
                  title={modelName}
                >
                  {modelName}
                </h3>
                <p 
                    className="text-md font-bold mb-3"
                    style={{color: theme.primary }}    
                >
                    {modelPrice}
                </p>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`);
                  }}
                  className="mt-auto inline-block px-4 py-2 text-sm font-medium text-white rounded-full group-hover:scale-105 transition-transform transform duration-200 ease-out shadow-md group-hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ backgroundColor: `var(--card-primary-color)`, '--focus-ring-color': theme.accent } as React.CSSProperties}
                >
                  Estimate Value
                </button>
              </div>
            </div>
            
            {/* Animated background glow/border */}
            <div className="animated-bg-glow"></div>
            
            <style jsx>{`
              .floating-card .animated-bg-glow {
                content: '';
                position: absolute;
                top: -50%; left: -50%;
                width: 200%; height: 200%;
                background: radial-gradient(circle, var(--card-accent-color) 0%, transparent 70%);
                opacity: 0;
                transform: scale(0.8);
                transition: opacity 0.5s ease-out, transform 0.5s ease-out;
                z-index: 0;
                border-radius: ${cardRadius};
              }
              .floating-card:hover .animated-bg-glow {
                opacity: 0.15; /* Subtle glow */
                transform: scale(1);
              }
               .floating-card:focus-within .animated-bg-glow { /* Glow on focus as well */
                opacity: 0.1;
                transform: scale(1);
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