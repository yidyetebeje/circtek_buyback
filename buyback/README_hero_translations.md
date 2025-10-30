# Hero Component Translation System

This document describes the comprehensive translation system for Hero components, including both dynamic translations (from backend) and static translations (from message files), plus AI translation integration.

## Overview

The Hero translation system provides:

- **Dynamic translations**: Editable content stored in the backend (title, subtitle, description, etc.)
- **Static translations**: Non-editable UI text from message files (placeholders, labels, etc.)
- **AI translation**: Automatic translation generation for dynamic content
- **Fallback logic**: Graceful degradation when translations are missing
- **Live language switching**: Automatic updates when language changes

## Architecture

### Translation Utilities (`utils/heroTranslationUtils.ts`)

Core functions for handling hero translations:

```typescript
// Get static translations from message files
getStaticTranslation(key: string, locale: string, params?: Record<string, string | number>): string

// Get search placeholder based on hero variant
getHeroSearchPlaceholder(variant: string, locale: string): string

// Get complete translated content for a hero section
getTranslatedHeroContent(heroSection: HeroSection, currentLanguage: Language | null, useStaticFallbacks: boolean): TranslatedHeroContent

// AI Translation helpers
prepareHeroContentForAITranslation(heroSection: HeroSection): Record<string, string>
applyAITranslationToHero(heroSection: HeroSection, translatedTexts: Record<string, string>, targetLanguage: string): HeroSection
```

### Translation Hooks (`hooks/catalog/useHeroTranslations.ts`)

React hooks for easy integration:

```typescript
// Main translation hook
const { getTranslatedHero, getLocalizedText, getStaticText, currentLanguage } =
  useHeroTranslation();

// Content-specific hook
const translatedContent = useHeroTranslationContent(
  heroSection,
  useStaticFallbacks
);

// AI translation hook
const { translateHeroContent } = useHeroAITranslation();
```

## Static Translations (Message Files)

### Message File Structure

Static translations are stored in `messages/{locale}.json` files:

```json
{
  "HeroVariants": {
    "tradeInCashOut": "Trade In. Cash Out.",
    "trustedByCustomers": "Trusted by {count}+ customers",
    "popularDevices": "Popular: iPhone 16, Samsung Galaxy S24, MacBook Pro...",
    "livePricingUpdates": "Live Pricing Updates",
    "bestPriceGuarantee": "Best Price Guarantee",
    "fastPayment": "Fast Payment",
    "secureProcess": "100% Secure Process",
    "dataSecure": "Data Secure",
    "happyCustomers": "Happy Customers",
    "satisfiedUsers": "Satisfied Users",
    "searchPlaceholderDefault": "Search for your device (e.g. iPhone 15 Pro)",
    "searchPlaceholderCentered": "What device are you selling?",
    "searchPlaceholderMinimalist": "Enter device name (e.g. iPhone 14)",
    "searchPlaceholderSplit": "Find your device (e.g. Pixel 8)",
    "searchPlaceholderVideo": "Search your device model...",
    "searchPlaceholderGradient": "Search any device... (e.g. iPhone 15)",
    "searchPlaceholderSimple": "Search Product...",
    "sellDevicesWithConfidence": "Sell your devices with confidence",
    "fastPaymentTime": "24h",
    "ratingScore": "4.9/5",
    "satisfactionRate": "95%",
    "securityRate": "100%",
    "customersThisMonth": "4,500+ happy customers this month",
    "topPrices": "TOP\nPRICES"
  }
}
```

### Supported Languages

- English (`en`)
- German (`de`)
- Spanish (`es`)
- French (`fr`)
- Dutch (`nl`)
- Portuguese (`pt`)

### Using Static Translations

```typescript
// In a hero component
const translatedContent = useHeroTranslationContent(heroSection, true);

// Get static text with parameters
const trustBadge = translatedContent.getStaticText(
  "HeroVariants.trustedByCustomers",
  { count: "10,000" }
);

// Get search placeholder for current variant
const placeholder = translatedContent.getSearchPlaceholder();

// Get other static texts
const popularDevices = translatedContent.getStaticText(
  "HeroVariants.popularDevices"
);
const fastPayment = translatedContent.getStaticText("HeroVariants.fastPayment");
```

## Dynamic Translations (Backend)

### Hero Section Structure

```typescript
interface HeroSection {
  id: number;
  title: string;
  subtitle: string;
  description?: string;
  buttonText?: string;
  tagline?: string;
  trustBadge?: string;
  liveBadgeText?: string;
  taglineBefore?: string;
  variant?: string;
  backgroundImage: string;
  translations?: {
    [locale: string]: {
      title?: string;
      subtitle?: string;
      description?: string;
      buttonText?: string;
      tagline?: string;
      trustBadge?: string;
      liveBadgeText?: string;
      taglineBefore?: string;
    };
  };
}
```

### Using Dynamic Translations

```typescript
// In a hero component
const translatedContent = useHeroTranslationContent(heroSection);

// Access translated fields
const title = translatedContent.title;
const subtitle = translatedContent.subtitle;
const description = translatedContent.description;
const buttonText = translatedContent.buttonText;
```

## AI Translation Integration

### API Endpoint

The AI translation system uses the existing `/api/catalog/ai-translation/component` endpoint:

```typescript
POST /api/catalog/ai-translation/component
{
  "componentType": "hero",
  "sourceLanguageCode": "en",
  "targetLanguageCode": "es",
  "texts": {
    "title": "Trade In Your Device",
    "subtitle": "Get instant quotes for your electronics",
    "description": "Sell your devices with confidence and get paid fast",
    "buttonText": "Get Quote Now",
    "tagline": "Trade In. Cash Out.",
    "trustBadge": "Trusted by 10,000+ customers",
    "liveBadgeText": "Live Pricing Updates",
    "taglineBefore": "Sell your devices with confidence"
  }
}
```

### Using AI Translation

```typescript
// In a component or admin interface
const { translateHeroContent } = useHeroAITranslation();

try {
  const translatedHero = await translateHeroContent(
    heroSection,
    "en", // source language
    "es" // target language
  );

  // translatedHero now contains the translations in heroSection.translations['es']
  console.log(translatedHero.translations["es"]);
} catch (error) {
  console.error("Translation failed:", error);
}
```

### AI Translation Features

- **Context-aware**: Understands hero component context for better translations
- **Marketing tone**: Maintains engaging, marketing-appropriate language
- **Parameter preservation**: Keeps placeholders like `{count}` intact
- **Retry logic**: Automatic retries on failure
- **Fallback handling**: Graceful degradation when AI translation fails

## Component Integration

### Basic Usage

```typescript
import { useHeroTranslationContent } from "@/hooks/catalog/useHeroTranslations";

export function MyHeroComponent({ heroSection, primaryColor }: HeroProps) {
  // Get translated content with static fallbacks
  const translatedContent = useHeroTranslationContent(heroSection, true);

  return (
    <section>
      <h1>{translatedContent.title}</h1>
      <h2>{translatedContent.subtitle}</h2>

      {/* Use static translations for UI elements */}
      <input placeholder={translatedContent.getSearchPlaceholder()} />

      <p>{translatedContent.getStaticText("HeroVariants.popularDevices")}</p>

      <div>
        {translatedContent.getStaticText("HeroVariants.trustedByCustomers", {
          count: "10,000",
        })}
      </div>
    </section>
  );
}
```

### Advanced Usage with AI Translation

```typescript
import {
  useHeroTranslation,
  useHeroAITranslation,
} from "@/hooks/catalog/useHeroTranslations";

export function HeroEditor({ heroSection, onSave }: HeroEditorProps) {
  const { getTranslatedHero, currentLanguage } = useHeroTranslation();
  const { translateHeroContent } = useHeroAITranslation();

  const handleAITranslate = async (targetLanguage: string) => {
    try {
      const translatedHero = await translateHeroContent(
        heroSection,
        "en",
        targetLanguage
      );
      onSave(translatedHero);
    } catch (error) {
      console.error("AI translation failed:", error);
    }
  };

  const translatedContent = getTranslatedHero(heroSection);

  return (
    <div>
      <input
        value={translatedContent.title}
        onChange={(e) => updateTitle(e.target.value)}
      />

      <button onClick={() => handleAITranslate("es")}>
        Translate to Spanish
      </button>
    </div>
  );
}
```

## Fallback Logic

The translation system uses a comprehensive fallback hierarchy:

1. **Current language translation** (from `heroSection.translations[currentLocale]`)
2. **English translation** (from `heroSection.translations['en']`)
3. **Original content** (from `heroSection.title`, `heroSection.subtitle`, etc.)
4. **Static translations** (from message files, if `useStaticFallbacks` is true)
5. **Translation key** (as last resort)

### Example Fallback Flow

```typescript
// For title field in Spanish (es):
1. heroSection.translations['es']?.title
2. heroSection.translations['en']?.title
3. heroSection.title
4. getStaticText('HeroVariants.defaultTitle') // if useStaticFallbacks = true
5. 'HeroVariants.defaultTitle' // key as fallback
```

## ComponentEditor Integration

The hero translation system integrates seamlessly with the existing ComponentEditor:

### Translation Tabs

The ComponentEditor automatically detects hero sections and provides:

- Language tabs for each supported locale
- AI translation buttons for quick translation
- Live preview of translated content
- Validation for required fields

### AI Translation Button

```typescript
// In ComponentEditor
<button
  onClick={() => handleAITranslate("hero", heroSection, "en", "es")}
  className="ai-translate-btn"
>
  🤖 Translate to Spanish
</button>
```

## File Structure

```
buyback/
├── utils/
│   └── heroTranslationUtils.ts          # Core translation utilities
├── hooks/
│   └── catalog/
│       └── useHeroTranslations.ts       # React hooks for translations
├── messages/
│   ├── en.json                          # English static translations
│   ├── de.json                          # German static translations
│   ├── es.json                          # Spanish static translations
│   ├── fr.json                          # French static translations
│   ├── nl.json                          # Dutch static translations
│   └── pt.json                          # Portuguese static translations
├── components/
│   └── homepage/
│       └── hero-variants/
│           ├── DefaultHero.tsx          # Updated with translations
│           ├── CenteredHero.tsx         # Updated with translations
│           ├── MinimalistHero.tsx       # Updated with translations
│           ├── SimpleHero.tsx           # Updated with translations
│           ├── SplitHero.tsx            # Updated with translations
│           ├── VideoHero.tsx            # Updated with translations
│           └── GradientHero.tsx         # Updated with translations
└── README_hero_translations.md         # This documentation
```

## Adding New Translatable Fields

To add a new translatable field to hero sections:

### 1. Update TypeScript Interfaces

```typescript
// In types/shop.ts
interface HeroSection {
  // ... existing fields
  newField?: string;
  translations?: {
    [locale: string]: {
      // ... existing translation fields
      newField?: string;
    };
  };
}
```

### 2. Update Translation Utilities

```typescript
// In utils/heroTranslationUtils.ts
export function getTranslatedHeroContent(/* ... */) {
  return {
    // ... existing fields
    newField: translation.newField || heroSection.newField,
  };
}

export function prepareHeroContentForAITranslation(heroSection: HeroSection) {
  const texts: Record<string, string> = {};
  // ... existing fields
  if (heroSection.newField) texts.newField = heroSection.newField;
  return texts;
}
```

### 3. Update Components

```typescript
// In hero components
const translatedContent = useHeroTranslationContent(heroSection);
const newFieldValue = translatedContent.newField;
```

### 4. Add Static Translations (if needed)

```json
// In messages/en.json
{
  "HeroVariants": {
    "newStaticField": "New static text value"
  }
}
```

## Best Practices

### 1. Always Use Translation Hooks

```typescript
// ✅ Good
const translatedContent = useHeroTranslationContent(heroSection);
const title = translatedContent.title;

// ❌ Bad
const title = heroSection.title; // No translation support
```

### 2. Enable Static Fallbacks

```typescript
// ✅ Good - provides fallbacks for missing content
const translatedContent = useHeroTranslationContent(heroSection, true);

// ⚠️ Okay - but no static fallbacks
const translatedContent = useHeroTranslationContent(heroSection, false);
```

### 3. Use Parameterized Static Translations

```typescript
// ✅ Good - flexible and reusable
const trustBadge = translatedContent.getStaticText(
  "HeroVariants.trustedByCustomers",
  {
    count: customerCount,
  }
);

// ❌ Bad - hardcoded values
const trustBadge = `Trusted by ${customerCount}+ customers`;
```

### 4. Handle AI Translation Errors

```typescript
// ✅ Good - proper error handling
try {
  const translated = await translateHeroContent(heroSection, "en", "es");
  onSuccess(translated);
} catch (error) {
  console.error("Translation failed:", error);
  showErrorMessage("Translation failed. Please try again.");
}
```

### 5. Test with Missing Translations

Always test your components with:

- Missing translation objects
- Partial translations
- Unsupported languages
- Empty content

## Troubleshooting

### Common Issues

1. **Missing translations**: Check fallback logic and ensure static translations are available
2. **AI translation failures**: Verify API configuration and network connectivity
3. **Type errors**: Ensure all interfaces are properly updated when adding new fields
4. **Performance issues**: Consider memoization for expensive translation operations

### Debug Mode

Enable debug logging for translation operations:

```typescript
// In development
const translatedContent = useHeroTranslationContent(heroSection, true);
console.log("Translation result:", translatedContent);
console.log("Current language:", currentLanguage);
console.log("Available translations:", heroSection.translations);
```
