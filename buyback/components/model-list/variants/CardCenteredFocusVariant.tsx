"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ModelListItemType, TranslatableText, DesignSystem, ThemeColors } from '@/types/shop';
import { getLocalizedText } from '@/utils/localization';

interface CardCenteredFocusVariantProps {
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

export function CardCenteredFocusVariant({ 
  models, 
  theme, 
  design, 
  currentLocale = 'en', 
  defaultLocale = 'en' 
}: CardCenteredFocusVariantProps) {
  const router = useRouter();

  if (!models || models.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">No models found.</p>;
  }

  const cardRadius = design?.borderRadius?.card || '1rem';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 p-4">
      {models.map((model) => {
        const modelName = resolveText(model.name, currentLocale, defaultLocale) || 'Unnamed Model';

        return (
          <Link
            key={model.id}
            href={`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`}
            className="centered-focus-card group relative block overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out h-72"
            style={{
              borderRadius: cardRadius,
              borderColor: theme.accent, // For focus ring
              '--card-primary-color': theme.primary,
              '--card-text-color': '#FFFFFF',
            } as React.CSSProperties}
            aria-label={`View details for ${modelName}`}
          >
            <div className="card-bg-image absolute inset-0 z-0">
              {model.imageUrl ? (
                <Image
                  src={model.imageUrl}
                  alt={modelName}
                  layout="fill"
                  objectFit="contain"
                  className="transition-transform duration-500 ease-out group-hover:scale-110 group-hover:brightness-75"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 dark:bg-gray-700"></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent group-hover:from-black/80 transition-all duration-300"></div>
            </div>

            <div className="card-content relative z-10 flex flex-col justify-end items-center h-full p-6 text-center">
              <div className="transform transition-all duration-300 ease-out group-hover:-translate-y-2">
                <h3 
                  className="text-xl font-bold text-white drop-shadow-md mb-2"
                  style={{ color: 'white' }} // Ensure title is visible on image
                >
                  {modelName}
                </h3>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/${currentLocale}/sell/${model.sef_url || model.id}/estimate`);
                  }}
                  className="inline-block text-sm font-semibold py-2 px-5 rounded-full bg-[var(--card-primary-color)] text-[var(--card-text-color)] shadow-md group-hover:scale-105 group-hover:shadow-lg transition-all duration-300 ease-out transform opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ '--focus-ring-color': theme.accent } as React.CSSProperties}
                >
                  Estimate Value
                </button>
              </div>
            </div>
            
            {/* Animated Border - Pulse/Glow Effect */}
            <div className="animated-border-glow"></div>

            <style jsx>{`
              .centered-focus-card .animated-border-glow {
                content: '';
                position: absolute;
                top: -4px; left: -4px; right: -4px; bottom: -4px;
                border-radius: calc(${cardRadius} + 4px);
                border: 2px solid transparent;
                z-index: 0;
                opacity: 0;
                transition: opacity 0.4s ease-in-out, border-color 0.4s ease-in-out;
              }
              .centered-focus-card:hover .animated-border-glow {
                opacity: 1;
                border-color: var(--card-primary-color);
                animation: pulseGlow 1.5s infinite alternate;
              }

              @keyframes pulseGlow {
                0% {
                  box-shadow: 0 0 5px 0px var(--card-primary-color), 0 0 8px 0px var(--card-primary-color);
                }
                100% {
                  box-shadow: 0 0 10px 3px var(--card-primary-color), 0 0 15px 5px var(--card-primary-color);
                }
              }
            `}</style>
          </Link>
        );
      })}
    </div>
  );
} 