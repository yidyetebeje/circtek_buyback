// Define TranslatableText type directly in this utility file for self-containment
// or import from '@/types/shop' if preferred for central type management.
import { ItemTranslation } from '@/types/catalog'; // Assuming this is the correct path

export interface TranslatableText {
  [locale: string]: string;
}

/**
 * Get localized text from a translatable text object
 * @param textObj - The translatable text object
 * @param locale - The current locale
 * @param defaultLocale - The fallback locale (default: 'en')
 * @returns The localized text or undefined if not found
 */
export const getLocalizedText = (
  textObj: TranslatableText | string | undefined, 
  locale: string, 
  defaultLocale: string = 'en'
): string => {
  // If it's already a string, return it
  if (typeof textObj === 'string') return textObj;
  
  // If it's undefined or null, return empty string
  if (!textObj) return '';
  
  // If it's an object, try to get the localized version
  if (typeof textObj === 'object') {
    return textObj[locale] || textObj[defaultLocale] || textObj.en || Object.values(textObj)[0] || '';
  }
  
  return '';
};

/**
 * Check if a language code is supported
 * @param code - The language code to check
 * @param supportedLanguages - Array of supported language codes
 * @returns Whether the language is supported
 */
export const isLanguageSupported = (code: string, supportedLanguages: string[]): boolean => {
  return supportedLanguages.includes(code);
};

/**
 * Get browser language preference
 * @returns The browser's preferred language code
 */
export const getBrowserLanguage = (): string => {
  if (typeof window === 'undefined') return 'en';
  
  const browserLanguages = navigator.languages || [navigator.language];
  const primaryBrowserLang = browserLanguages[0]?.split('-')[0] || 'en';
  
  return primaryBrowserLang;
};

/**
 * Get dynamically translated text from an original string and its translations array.
 * @param originalText - The base text (e.g., in the primary language).
 * @param translations - Array of available translations for the text.
 * @param locale - The desired locale code.
 * @param defaultLocale - The application's fallback locale code (e.g., 'en').
 * @returns The translated string or the original text if no suitable translation is found.
 */
export const getDynamicText = (
  originalText: string | undefined,
  translations: ItemTranslation[] | undefined,
  locale: string,
  defaultLocale: string = 'en'
): string => {
  console.log("orginal text", originalText);
  console.log("translation text", translations)
  if(locale == 'en'){
    return originalText || '';
  }
  if (originalText === undefined) return '';
  if (!translations || translations.length === 0) {
    return originalText;
  }

  // 1. Try current locale
  let translation = translations.find(t => t.language?.code === locale);
  if (translation?.title) { // Assuming 'title' is the relevant field for translation
    return translation.title;
  }

  // 2. Try application's default/fallback locale (e.g., 'en'), if different from current
  if (locale !== defaultLocale) {
    translation = translations.find(t => t.language?.code === defaultLocale);
    if (translation?.title) {
      return translation.title;
    }
  }
  
  // 3. Try to find if any translation is marked as default *in the data itself*
  const defaultInDataTranslation = translations.find(
    (t) => t.language?.is_default === true || t.language?.is_default === 1
  );
  if (defaultInDataTranslation?.title) {
    return defaultInDataTranslation.title;
  }

  // 4. If all else fails, return the original text
  return originalText;
};

/**
 * Format language name for display
 * @param code - Language code
 * @param name - Language name
 * @param nativeName - Native language name
 * @returns Formatted display name
 */
export const formatLanguageDisplayName = (code: string, name: string, nativeName?: string): string => {
  if (nativeName && nativeName !== name) {
    return `${nativeName} (${name})`;
  }
  return name;
};

/**
 * Get language direction (LTR/RTL)
 * @param code - Language code
 * @returns 'ltr' or 'rtl'
 */
export const getLanguageDirection = (code: string): 'ltr' | 'rtl' => {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(code) ? 'rtl' : 'ltr';
}; 