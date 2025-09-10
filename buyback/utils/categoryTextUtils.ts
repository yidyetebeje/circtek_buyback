import { TranslatableText, CategoryTextConfig } from '@/types/shop';
import { useTranslations } from 'next-intl';

/**
 * Get localized text with fallback to default message translations
 */
export function getLocalizedText(
  textInput: TranslatableText | string | undefined,
  locale: string,
  defaultLocale: string = 'en'
): string {
  if (typeof textInput === 'string') return textInput;
  if (textInput && typeof textInput === 'object') {
    return textInput[locale] || textInput[defaultLocale] || textInput.en || Object.values(textInput)[0] || '';
  }
  return '';
}

/**
 * Get category text with fallback to message translations
 */
export function getCategoryText(
  textKey: keyof CategoryTextConfig,
  categoryTextConfig: CategoryTextConfig | undefined,
  t: ReturnType<typeof useTranslations>,
  locale: string,
  deviceName?: string
): string {
  // First try to get from custom configuration
  if (categoryTextConfig && categoryTextConfig[textKey]) {
    const customText = getLocalizedText(categoryTextConfig[textKey], locale);
    if (customText) {
      // Handle placeholder replacement for sellDevice
      if (textKey === 'sellDevice' && deviceName) {
        return customText.replace('{deviceName}', deviceName);
      }
      return customText;
    }
  }

  // Fallback to default translations from messages
  const messageKey = `CategoryVariants.${textKey}`;
  
  // Handle placeholder replacement for sellDevice - pass deviceName to t() function
  if (textKey === 'sellDevice' && deviceName) {
    const fallbackText = t(messageKey, { deviceName });
    return fallbackText;
  }
  
  const fallbackText = t(messageKey);
  return fallbackText;
}

/**
 * Hook for category text management
 */
export function useCategoryText(
  categoryTextConfig: CategoryTextConfig | undefined,
  locale: string
) {
  const t = useTranslations();

  return {
    getCategoryText: (textKey: keyof CategoryTextConfig, deviceName?: string) =>
      getCategoryText(textKey, categoryTextConfig, t, locale, deviceName),
    getLocalizedText: (textInput: TranslatableText | string | undefined) =>
      getLocalizedText(textInput, locale),
  };
} 