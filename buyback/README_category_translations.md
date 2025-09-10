# Category Translation System

This document explains how to use the new category translation system that automatically displays category content based on the selected language.

## Overview

The system automatically translates category titles, descriptions, and metadata based on the current language selection. It integrates with the existing language management system and provides fallbacks for missing translations.

## How It Works

1. **Language Selection**: The current language is managed by the `currentLanguageAtom` from the Jotai store
2. **Translation Lookup**: Categories include a `translations` array with content in different languages
3. **Automatic Fallback**: If no translation exists for the current language, it falls back to the default language or original content

## Implementation

### Category Components

All category variant components now automatically use translations:

- `DefaultCategory`
- `GridCategory`
- `CarouselCategory`
- `MinimalistCategory`
- `FeaturedButtonsCategory`

### Backend Integration

The backend already returns categories with translations via the API endpoints in:

- `app/src/catalog/routes/categoryRoutes.ts`
- `app/src/catalog/repositories/categoryRepository.ts`

### Translation Structure

Categories from the API include this structure:

```typescript
interface Category {
  id: number;
  title: string;
  description?: string;
  translations?: CategoryTranslation[];
  // ... other fields
}

interface CategoryTranslation {
  id: number;
  category_id: number;
  language_id: number;
  title?: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  language?: Language;
}
```

## Usage

### In Components

The category components automatically handle translations. No changes needed in existing usage:

```tsx
import { CategoryList } from "@/components/homepage/CategoryList";

// Categories will be automatically translated based on current language
<CategoryList
  categories={categories}
  primaryColor="#007bff"
  variant="default"
  title="Browse Categories"
  subtitle="Select a device category"
/>;
```

### Custom Translation Hook

For custom components that need category translations:

```tsx
import { useCategoryTranslation } from "@/hooks/catalog/useCategoryTranslations";

function MyComponent({ category }) {
  const { getTranslatedCategory } = useCategoryTranslation();
  const translatedContent = getTranslatedCategory(category);

  return (
    <div>
      <h2>{translatedContent.title}</h2>
      <p>{translatedContent.description}</p>
    </div>
  );
}
```

### Direct Utility Usage

For one-off translations:

```tsx
import { getTranslatedCategoryContent } from "@/utils/categoryTranslationUtils";
import { useAtomValue } from "jotai";
import { currentLanguageObjectAtom } from "@/store/atoms";

function MyComponent({ category }) {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  const translatedContent = getTranslatedCategoryContent(
    category,
    currentLanguage
  );

  return <h2>{translatedContent.title}</h2>;
}
```

## Fallback Logic

The translation system uses this fallback order:

1. **Current Language**: Look for translation matching the current language code
2. **Default Language**: Fall back to translation marked as default language
3. **Original Content**: Use the original category title/description

## Language Management

The language system is managed by:

- `currentLanguageAtom`: Currently selected language code
- `currentLanguageObjectAtom`: Full language object with metadata
- `availableLanguagesAtom`: List of available languages

Language changes automatically update all category displays throughout the app.

## File Structure

```
buyback/
├── utils/categoryTranslationUtils.ts     # Core translation logic
├── hooks/catalog/useCategoryTranslations.ts # Translation hooks
├── store/atoms.ts                        # Language state management
└── components/homepage/
    ├── CategoryList.tsx                  # Main category list component
    └── category-variants/               # Individual variant components
        ├── DefaultCategory.tsx
        ├── GridCategory.tsx
        ├── CarouselCategory.tsx
        ├── MinimalistCategory.tsx
        └── FeaturedButtonsCategory.tsx
```

## Testing

To test translations:

1. Add test translations to your categories via the admin panel
2. Switch languages using the language selector
3. Verify that category titles and descriptions update automatically
4. Check that fallbacks work when translations are missing

The system will gracefully handle missing translations and always display something meaningful to users.
