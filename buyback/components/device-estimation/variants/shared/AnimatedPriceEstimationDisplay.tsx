"use client";

import { motion } from "framer-motion";
import { ThemeColors, TranslatableText } from "@/types/shop";

interface AnimatedPriceEstimationDisplayProps {
  estimatedPrice: number | null;
  onCheckout: () => void;
  theme: ThemeColors;
  shopName?: string;
  estimationTitle?: TranslatableText;
  checkoutButtonText?: TranslatableText;
  locale?: string;
  defaultLocale?: string;
}

const getLocalizedText = (textObj: TranslatableText | string | undefined, locale: string, defaultLocale: string): string => {
  if (!textObj) return '';
  if (typeof textObj === 'string') return textObj;
  return textObj[locale] || textObj[defaultLocale] || '';
};

export function AnimatedPriceEstimationDisplay({
  estimatedPrice,
  onCheckout,
  theme,
  shopName = '',
  estimationTitle,
  checkoutButtonText,
  locale = 'en',
  defaultLocale = 'en'
}: AnimatedPriceEstimationDisplayProps) {
  const title = getLocalizedText(estimationTitle, locale, defaultLocale) || 'Your Device Valuation';
  const buttonText = getLocalizedText(checkoutButtonText, locale, defaultLocale) || 'Continue to Checkout';

  // If price is not available yet
  if (estimatedPrice === null) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center text-center p-10 space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="w-16 h-16 border-4 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ borderTopColor: "transparent", borderColor: theme.primary }}
        />
        <p className="text-lg text-gray-600 dark:text-gray-300">Calculating your device value...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 p-8 flex flex-col items-center justify-center md:p-10 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center space-y-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        damping: 20, 
        stiffness: 100 
      }}
    >
      <motion.h2 
        className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {title}
      </motion.h2>
      
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div className="text-gray-500 dark:text-gray-400 text-lg">
          Estimated value:
        </div>
        
        <motion.div 
          className="text-5xl md:text-6xl font-bold"
          style={{ color: theme.primary }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            delay: 0.7, 
            type: "spring", 
            damping: 10, 
            stiffness: 100 
          }}
        >
          €{estimatedPrice}
        </motion.div>
        
        <motion.p 
          className="text-gray-600 dark:text-gray-300 mt-4 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          {shopName ? `${shopName} is offering` : 'We are offering'} €{estimatedPrice} for your device based on the condition you&apos;ve described.
        </motion.p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="flex flex-col items-center justify-center"
      >
        <motion.button
          onClick={onCheckout}
          className="px-4 py-2 rounded-lg text-white font-medium text-lg shadow-lg transform transition-all duration-200 flex items-center justify-center gap-2"
          style={{ backgroundColor: theme.primary }}
          whileHover={{ scale: 1.03, boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)" }}
          whileTap={{ scale: 0.98 }}
        >
          {buttonText}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </motion.button>
        
        <motion.p
          className="text-sm text-gray-500 dark:text-gray-400 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          By proceeding, you agree to our Terms & Conditions
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
