import { HeroSection, TranslatableText } from '@/types/shop';
import { Language } from '@/store/atoms';

/**
 * Get localized text with fallback logic
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
 * Get static translation from message files
 * This integrates with the existing i18n system and message files
 */
export function getStaticTranslation(
  key: string,
  locale: string,
  params?: Record<string, string | number>
): string {
  // In a real implementation, this would use next-intl or the existing i18n system
  // For now, we'll use the message files structure we just created
  
  // Import the message files dynamically based on locale
  const messages = getMessagesForLocale(locale);
  
  // Navigate through the nested key structure (e.g., 'HeroVariants.tradeInCashOut')
  const keys = key.split('.');
  let value: Record<string, unknown> | string = messages;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k] as Record<string, unknown> | string;
    } else {
      // Fallback to English if key not found
      const englishMessages = getMessagesForLocale('en');
      let englishValue: Record<string, unknown> | string = englishMessages;
      for (const ek of keys) {
        if (englishValue && typeof englishValue === 'object' && ek in englishValue) {
          englishValue = (englishValue as Record<string, unknown>)[ek] as Record<string, unknown> | string;
        } else {
          return key; // Return key if not found anywhere
        }
      }
      value = englishValue;
      break;
    }
  }
  
  let text = typeof value === 'string' ? value : key;
  
  // Simple parameter replacement
  if (params) {
    Object.entries(params).forEach(([param, paramValue]) => {
      text = text.replace(`{${param}}`, String(paramValue));
    });
  }
  
  return text;
}

/**
 * Get messages for a specific locale
 * This would typically be handled by your i18n system
 */
function getMessagesForLocale(locale: string): Record<string, Record<string, string>> {
  // This is a simplified version - in a real app, you'd use next-intl or similar
  // For now, we'll return the structure that matches our message files
  
  const messageStructures: Record<string, Record<string, Record<string, string>>> = {
    'en': {
      HeroVariants: {
        tradeInCashOut: 'Trade In. Cash Out.',
        trustedByCustomers: 'Trusted by {count}+ customers',
        popularDevices: 'Popular: iPhone 16, Samsung Galaxy S24, MacBook Pro...',
        livePricingUpdates: 'Live Pricing Updates',
        bestPriceGuarantee: 'Best Price Guarantee',
        fastPayment: 'Fast Payment',
        secureProcess: '100% Secure Process',
        dataSecure: 'Data Secure',
        happyCustomers: 'Happy Customers',
        satisfiedUsers: 'Satisfied Users',
        searchPlaceholderDefault: 'Search for your device (e.g. iPhone 15 Pro)',
        searchPlaceholderCentered: 'What device are you selling?',
        searchPlaceholderMinimalist: 'Enter device name (e.g. iPhone 14)',
        searchPlaceholderSplit: 'Find your device (e.g. Pixel 8)',
        searchPlaceholderVideo: 'Search your device model...',
        searchPlaceholderGradient: 'Search any device... (e.g. iPhone 15)',
        searchPlaceholderSimple: 'Search Product...',
        sellDevicesWithConfidence: 'Sell your devices with confidence',
        fastPaymentTime: '24h',
        ratingScore: '4.9/5',
        satisfactionRate: '95%',
        securityRate: '100%',
        customersThisMonth: '4,500+ happy customers this month',
        topPrices: 'TOP\nPRICES'
      }
    },
    'de': {
      HeroVariants: {
        tradeInCashOut: 'Eintauschen. Geld erhalten.',
        trustedByCustomers: 'Vertraut von {count}+ Kunden',
        popularDevices: 'Beliebt: iPhone 16, Samsung Galaxy S24, MacBook Pro...',
        livePricingUpdates: 'Live-PreisUpdates',
        bestPriceGuarantee: 'Bestpreisgarantie',
        fastPayment: 'Schnelle Zahlung',
        secureProcess: '100% Sicherer Prozess',
        dataSecure: 'Datensicherheit',
        happyCustomers: 'Zufriedene Kunden',
        satisfiedUsers: 'Zufriedene Nutzer',
        searchPlaceholderDefault: 'Suchen Sie nach Ihrem Gerät (z.B. iPhone 15 Pro)',
        searchPlaceholderCentered: 'Welches Gerät verkaufen Sie?',
        searchPlaceholderMinimalist: 'Gerätename eingeben (z.B. iPhone 14)',
        searchPlaceholderSplit: 'Finden Sie Ihr Gerät (z.B. Pixel 8)',
        searchPlaceholderVideo: 'Suchen Sie Ihr Gerätemodell...',
        searchPlaceholderGradient: 'Beliebiges Gerät suchen... (z.B. iPhone 15)',
        searchPlaceholderSimple: 'Produkt suchen...',
        sellDevicesWithConfidence: 'Verkaufen Sie Ihre Geräte mit Vertrauen',
        fastPaymentTime: '24h',
        ratingScore: '4,9/5',
        satisfactionRate: '95%',
        securityRate: '100%',
        customersThisMonth: '4.500+ zufriedene Kunden diesen Monat',
        topPrices: 'TOP\nPREISE'
      }
    },
    'es': {
      HeroVariants: {
        tradeInCashOut: 'Intercambia. Obtén dinero.',
        trustedByCustomers: 'Confiado por {count}+ clientes',
        popularDevices: 'Popular: iPhone 16, Samsung Galaxy S24, MacBook Pro...',
        livePricingUpdates: 'Actualizaciones de Precios en Vivo',
        bestPriceGuarantee: 'Garantía del Mejor Precio',
        fastPayment: 'Pago Rápido',
        secureProcess: 'Proceso 100% Seguro',
        dataSecure: 'Datos Seguros',
        happyCustomers: 'Clientes Felices',
        satisfiedUsers: 'Usuarios Satisfechos',
        searchPlaceholderDefault: 'Busca tu dispositivo (ej. iPhone 15 Pro)',
        searchPlaceholderCentered: '¿Qué dispositivo estás vendiendo?',
        searchPlaceholderMinimalist: 'Ingresa el nombre del dispositivo (ej. iPhone 14)',
        searchPlaceholderSplit: 'Encuentra tu dispositivo (ej. Pixel 8)',
        searchPlaceholderVideo: 'Busca el modelo de tu dispositivo...',
        searchPlaceholderGradient: 'Busca cualquier dispositivo... (ej. iPhone 15)',
        searchPlaceholderSimple: 'Buscar Producto...',
        sellDevicesWithConfidence: 'Vende tus dispositivos con confianza',
        fastPaymentTime: '24h',
        ratingScore: '4,9/5',
        satisfactionRate: '95%',
        securityRate: '100%',
        customersThisMonth: '4.500+ clientes felices este mes',
        topPrices: 'MEJORES\nPRECIOS'
      }
    },
    'fr': {
      HeroVariants: {
        tradeInCashOut: 'Échangez. Obtenez de l\'argent.',
        trustedByCustomers: 'Fait confiance par {count}+ clients',
        popularDevices: 'Populaire: iPhone 16, Samsung Galaxy S24, MacBook Pro...',
        livePricingUpdates: 'Mises à Jour de Prix en Direct',
        bestPriceGuarantee: 'Garantie du Meilleur Prix',
        fastPayment: 'Paiement Rapide',
        secureProcess: 'Processus 100% Sécurisé',
        dataSecure: 'Données Sécurisées',
        happyCustomers: 'Clients Satisfaits',
        satisfiedUsers: 'Utilisateurs Satisfaits',
        searchPlaceholderDefault: 'Recherchez votre appareil (ex. iPhone 15 Pro)',
        searchPlaceholderCentered: 'Quel appareil vendez-vous?',
        searchPlaceholderMinimalist: 'Entrez le nom de l\'appareil (ex. iPhone 14)',
        searchPlaceholderSplit: 'Trouvez votre appareil (ex. Pixel 8)',
        searchPlaceholderVideo: 'Recherchez le modèle de votre appareil...',
        searchPlaceholderGradient: 'Recherchez n\'importe quel appareil... (ex. iPhone 15)',
        searchPlaceholderSimple: 'Rechercher un Produit...',
        sellDevicesWithConfidence: 'Vendez vos appareils en toute confiance',
        fastPaymentTime: '24h',
        ratingScore: '4,9/5',
        satisfactionRate: '95%',
        securityRate: '100%',
        customersThisMonth: '4 500+ clients satisfaits ce mois',
        topPrices: 'MEILLEURS\nPRIX'
      }
    },
    'nl': {
      HeroVariants: {
        tradeInCashOut: 'Inruilen. Geld krijgen.',
        trustedByCustomers: 'Vertrouwd door {count}+ klanten',
        popularDevices: 'Populair: iPhone 16, Samsung Galaxy S24, MacBook Pro...',
        livePricingUpdates: 'Live Prijsupdates',
        bestPriceGuarantee: 'Beste Prijs Garantie',
        fastPayment: 'Snelle Betaling',
        secureProcess: '100% Veilig Proces',
        dataSecure: 'Data Veilig',
        happyCustomers: 'Tevreden Klanten',
        satisfiedUsers: 'Tevreden Gebruikers',
        searchPlaceholderDefault: 'Zoek naar je apparaat (bijv. iPhone 15 Pro)',
        searchPlaceholderCentered: 'Welk apparaat verkoop je?',
        searchPlaceholderMinimalist: 'Voer apparaatnaam in (bijv. iPhone 14)',
        searchPlaceholderSplit: 'Vind je apparaat (bijv. Pixel 8)',
        searchPlaceholderVideo: 'Zoek je apparaatmodel...',
        searchPlaceholderGradient: 'Zoek elk apparaat... (bijv. iPhone 15)',
        searchPlaceholderSimple: 'Zoek Product...',
        sellDevicesWithConfidence: 'Verkoop je apparaten met vertrouwen',
        fastPaymentTime: '24u',
        ratingScore: '4,9/5',
        satisfactionRate: '95%',
        securityRate: '100%',
        customersThisMonth: '4.500+ tevreden klanten deze maand',
        topPrices: 'TOP\nPRIJZEN'
      }
    },
    'pt': {
      HeroVariants: {
        tradeInCashOut: 'Troque. Receba dinheiro.',
        trustedByCustomers: 'Confiado por {count}+ clientes',
        popularDevices: 'Popular: iPhone 16, Samsung Galaxy S24, MacBook Pro...',
        livePricingUpdates: 'Atualizações de Preços ao Vivo',
        bestPriceGuarantee: 'Garantia do Melhor Preço',
        fastPayment: 'Pagamento Rápido',
        secureProcess: 'Processo 100% Seguro',
        dataSecure: 'Dados Seguros',
        happyCustomers: 'Clientes Felizes',
        satisfiedUsers: 'Usuários Satisfeitos',
        searchPlaceholderDefault: 'Procure seu dispositivo (ex. iPhone 15 Pro)',
        searchPlaceholderCentered: 'Que dispositivo você está vendendo?',
        searchPlaceholderMinimalist: 'Digite o nome do dispositivo (ex. iPhone 14)',
        searchPlaceholderSplit: 'Encontre seu dispositivo (ex. Pixel 8)',
        searchPlaceholderVideo: 'Procure seu modelo de dispositivo...',
        searchPlaceholderGradient: 'Procure qualquer dispositivo... (ex. iPhone 15)',
        searchPlaceholderSimple: 'Buscar Produto...',
        sellDevicesWithConfidence: 'Venda seus dispositivos com confiança',
        fastPaymentTime: '24h',
        ratingScore: '4,9/5',
        satisfactionRate: '95%',
        securityRate: '100%',
        customersThisMonth: '4.500+ clientes felizes este mês',
        topPrices: 'MELHORES\nPREÇOS'
      }
    }
  };
  
  return messageStructures[locale] || messageStructures['en'];
}

/**
 * Get search placeholder based on hero variant
 */
export function getHeroSearchPlaceholder(
  variant: string = 'default',
  locale: string = 'en'
): string {
  const placeholderKey = `HeroVariants.searchPlaceholder${variant.charAt(0).toUpperCase() + variant.slice(1)}`;
  return getStaticTranslation(placeholderKey, locale);
}

/**
 * Get translated content for a hero section based on current language
 * Supports both dynamic translations (from heroSection.translations) and static translations (from message files)
 */
export function getTranslatedHeroContent(
  heroSection: HeroSection, 
  currentLanguage: Language | null,
  useStaticFallbacks: boolean = true
): {
  title: string;
  subtitle: string;
  description?: string;
  buttonText?: string;
  tagline?: string;
  trustBadge?: string;
  liveBadgeText?: string;
  taglineBefore?: string;
  // Static translation helpers
  getSearchPlaceholder: () => string;
  getStaticText: (key: string, params?: Record<string, string | number>) => string;
  // Add other translatable fields as needed
} {
  const locale = currentLanguage?.code || 'en';

  // Helper function to get static translations
  const getStaticText = (key: string, params?: Record<string, string | number>) => 
    getStaticTranslation(key, locale, params);

  // Helper function to get search placeholder for this variant
  const getSearchPlaceholder = () => 
    getHeroSearchPlaceholder(heroSection.variant || 'default', locale);

  // If no current language or no translations, return default content with static fallbacks
  if (!currentLanguage || !heroSection.translations) {
    return {
      title: heroSection.title || '',
      subtitle: heroSection.subtitle || '',
      description: heroSection.description,
      buttonText: heroSection.buttonText,
      tagline: heroSection.tagline || (useStaticFallbacks ? getStaticText('HeroVariants.tradeInCashOut') : undefined),
      trustBadge: heroSection.trustBadge || (useStaticFallbacks ? getStaticText('HeroVariants.trustedByCustomers', { count: '10,000' }) : undefined),
      liveBadgeText: heroSection.liveBadgeText || (useStaticFallbacks ? getStaticText('HeroVariants.livePricingUpdates') : undefined),
      taglineBefore: heroSection.taglineBefore || (useStaticFallbacks ? getStaticText('HeroVariants.sellDevicesWithConfidence') : undefined),
      getSearchPlaceholder,
      getStaticText,
    };
  }

  // Find translation for current language
  const translation = heroSection.translations[locale];

  // If translation found, use translated content with fallbacks
  if (translation) {
    return {
      title: translation.title || heroSection.title || '',
      subtitle: translation.subtitle || heroSection.subtitle || '',
      description: translation.description || heroSection.description,
      buttonText: translation.buttonText || heroSection.buttonText,
      tagline: translation.tagline || heroSection.tagline || (useStaticFallbacks ? getStaticText('HeroVariants.tradeInCashOut') : undefined),
      trustBadge: translation.trustBadge || heroSection.trustBadge || (useStaticFallbacks ? getStaticText('HeroVariants.trustedByCustomers', { count: '10,000' }) : undefined),
      liveBadgeText: translation.liveBadgeText || heroSection.liveBadgeText || (useStaticFallbacks ? getStaticText('HeroVariants.livePricingUpdates') : undefined),
      taglineBefore: translation.taglineBefore || heroSection.taglineBefore || (useStaticFallbacks ? getStaticText('HeroVariants.sellDevicesWithConfidence') : undefined),
      getSearchPlaceholder,
      getStaticText,
    };
  }

  // Fallback to English translation if available
  const englishTranslation = heroSection.translations['en'];
  if (englishTranslation) {
    return {
      title: englishTranslation.title || heroSection.title || '',
      subtitle: englishTranslation.subtitle || heroSection.subtitle || '',
      description: englishTranslation.description || heroSection.description,
      buttonText: englishTranslation.buttonText || heroSection.buttonText,
      tagline: englishTranslation.tagline || heroSection.tagline || (useStaticFallbacks ? getStaticText('HeroVariants.tradeInCashOut') : undefined),
      trustBadge: englishTranslation.trustBadge || heroSection.trustBadge || (useStaticFallbacks ? getStaticText('HeroVariants.trustedByCustomers', { count: '10,000' }) : undefined),
      liveBadgeText: englishTranslation.liveBadgeText || heroSection.liveBadgeText || (useStaticFallbacks ? getStaticText('HeroVariants.livePricingUpdates') : undefined),
      taglineBefore: englishTranslation.taglineBefore || heroSection.taglineBefore || (useStaticFallbacks ? getStaticText('HeroVariants.sellDevicesWithConfidence') : undefined),
      getSearchPlaceholder,
      getStaticText,
    };
  }

  // Final fallback to original hero content with static fallbacks
  return {
    title: heroSection.title || '',
    subtitle: heroSection.subtitle || '',
    description: heroSection.description,
    buttonText: heroSection.buttonText,
    tagline: heroSection.tagline || (useStaticFallbacks ? getStaticText('HeroVariants.tradeInCashOut') : undefined),
    trustBadge: heroSection.trustBadge || (useStaticFallbacks ? getStaticText('HeroVariants.trustedByCustomers', { count: '10,000' }) : undefined),
    liveBadgeText: heroSection.liveBadgeText || (useStaticFallbacks ? getStaticText('HeroVariants.livePricingUpdates') : undefined),
    taglineBefore: heroSection.taglineBefore || (useStaticFallbacks ? getStaticText('HeroVariants.sellDevicesWithConfidence') : undefined),
    getSearchPlaceholder,
    getStaticText,
  };
}

/**
 * AI Translation Integration - prepare hero content for AI translation
 */
export function prepareHeroContentForAITranslation(heroSection: HeroSection): Record<string, string> {
  const texts: Record<string, string> = {};
  
  // Get English translations if they exist, otherwise fallback to original properties
  const englishTranslation = heroSection.translations?.['en'];
  
  // Use English translation if available, otherwise fallback to original hero properties
  const getTextValue = (field: keyof HeroSection) => {
    if (englishTranslation && englishTranslation[field as keyof typeof englishTranslation]) {
      return englishTranslation[field as keyof typeof englishTranslation] as string;
    }
    return heroSection[field] as string;
  };
  
  const title = getTextValue('title');
  const subtitle = getTextValue('subtitle');
  const description = getTextValue('description');
  const buttonText = getTextValue('buttonText');
  const tagline = getTextValue('tagline');
  const trustBadge = getTextValue('trustBadge');
  const liveBadgeText = getTextValue('liveBadgeText');
  const taglineBefore = getTextValue('taglineBefore');
  
  if (title) texts.title = title;
  if (subtitle) texts.subtitle = subtitle;
  if (description) texts.description = description;
  if (buttonText) texts.buttonText = buttonText;
  if (tagline) texts.tagline = tagline;
  if (trustBadge) texts.trustBadge = trustBadge;
  if (liveBadgeText) texts.liveBadgeText = liveBadgeText;
  if (taglineBefore) texts.taglineBefore = taglineBefore;
  
  return texts;
}

/**
 * AI Translation Integration - apply translated content back to hero section
 */
export function applyAITranslationToHero(
  heroSection: HeroSection,
  translatedTexts: Record<string, string>,
  targetLanguage: string
): HeroSection {
  if (!heroSection.translations) {
    heroSection.translations = {};
  }
  
  heroSection.translations[targetLanguage] = {
    ...heroSection.translations[targetLanguage],
    ...translatedTexts
  };
  
  return heroSection;
} 