"use client";

import { ThemeColors, TranslatableText } from "@/types/shop";

interface PriceEstimationDisplayProps {
  estimatedPrice: number | null;
  onCheckout: () => void;
  theme: ThemeColors;
  shopName?: string;
  estimationTitle?: TranslatableText | string;
  checkoutButtonText?: TranslatableText | string;
  locale?: string;
  defaultLocale?: string;
}

const getLocalizedText = (textObj: TranslatableText | string | undefined, locale: string, defaultLocale: string, fallback: string = ''): string => {
  if (!textObj) return fallback;
  if (typeof textObj === 'string') return textObj;
  return textObj[locale] || textObj[defaultLocale] || fallback;
};

export function PriceEstimationDisplay({
  estimatedPrice,
  onCheckout,
  theme,
  shopName = "Your Shop",
  estimationTitle,
  checkoutButtonText,
  locale = 'en',
  defaultLocale = 'en',
}: PriceEstimationDisplayProps) {

  const title = getLocalizedText(estimationTitle, locale, defaultLocale, "Your Estimated Device Value");
  const buttonText = getLocalizedText(checkoutButtonText, locale, defaultLocale, "Proceed to Checkout");

  return (
    <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-center">
      <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center rounded-full" style={{ backgroundColor: theme.primary + '20' /* Faint primary bg */ }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0c-1.11 0-2.08-.402-2.599-1M12 16v1m0-9h.01M12 16h.01" /> 
        </svg>
      </div>

      <h3 className="text-xl md:text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
        {title}
      </h3>
      
      {estimatedPrice !== null ? (
        <div className="my-6 md:my-8">
          <p className="text-4xl md:text-5xl font-bold mb-1" style={{ color: theme.primary }}>
            ${estimatedPrice.toFixed(2)}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            This is an estimated value based on the information you provided.
          </p>
        </div>
      ) : (
        <div className="my-6 md:my-8">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Please answer all questions to see your estimated device value.
          </p>
        </div>
      )}

      <button
        onClick={onCheckout}
        disabled={estimatedPrice === null}
        className="w-full max-w-xs self-center mx-auto py-3 px-6 rounded-lg text-white font-semibold shadow-md transition-all duration-300 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        style={{
          backgroundColor: estimatedPrice !== null ? theme.primary : theme.secondary + 'A0', // Faded secondary when disabled
        }}
      >
        {buttonText}
      </button>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-8">
        Thank you for choosing {shopName}!
      </p>
    </div>
  );
} 