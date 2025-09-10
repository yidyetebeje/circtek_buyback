# Question Translation System

This document explains how to use the new question translation system that automatically displays question content based on the selected language.

## Overview

The system automatically translates question titles, option labels, and other content based on the current language selection. It integrates with the existing language management system and provides fallbacks for missing translations.

## How It Works

1. **Language Selection**: The current language is managed by the `currentLanguageObjectAtom` from the Jotai store
2. **Translation Lookup**: Questions and options include a `translations` array with content in different languages
3. **Automatic Fallback**: If no translation exists for the current language, it falls back to the default language or original content

## Implementation

### Translation Utilities

The system provides utility functions in `utils/questionTranslationUtils.ts`:

```typescript
// Get translated content for a question set
getTranslatedQuestionSetContent(questionSet, currentLanguage);

// Get translated content for an individual question
getTranslatedQuestionContent(question, currentLanguage);

// Get translated content for a question option
getTranslatedOptionContent(option, currentLanguage);

// Simplified helpers
getTranslatedQuestionTitle(question, currentLanguage);
getTranslatedOptionTitle(option, currentLanguage);
```

### Custom Hooks

Use the provided hooks in `hooks/catalog/useQuestionTranslations.ts`:

```typescript
// Main translation hook
const { getTranslatedQuestion, getTranslatedOption, currentLanguage } =
  useQuestionTranslation();

// Specific content hooks
const translatedQuestion = useQuestionTranslationContent(question);
const translatedOption = useOptionTranslationContent(option);
```

### Component Integration

The `DeviceEstimationPageClient` automatically uses translations:

```typescript
// Questions are automatically translated based on current language
const processedQuestions = useMemo(() => {
  return allQuestions.map((q) => ({
    id: q.key || q.id.toString(),
    text: getTranslatedTitle(q.title, q.translations, currentLanguage),
    type: mapInputType(q.inputType),
    options: q.options.map((opt) => ({
      label: getTranslatedTitle(opt.title, opt.translations, currentLanguage),
      value: opt.key || opt.id.toString(),
    })),
  }));
}, [deviceModel, currentLanguage]);
```

## Data Structure

### Question Translation Structure

Questions should include translations in this format:

```typescript
interface Question {
  id: number;
  title: string;
  translations?: ItemTranslation[];
  options: QuestionOption[];
}

interface QuestionOption {
  id: number;
  title: string;
  translations?: ItemTranslation[];
}

interface ItemTranslation {
  id?: number;
  language_id: number;
  title?: string;
  description?: string;
  language?: Language;
}
```

### Language Structure

```typescript
interface Language {
  id: string;
  code: string;
  name: string;
  is_default?: boolean;
}
```

## Fallback Strategy

The translation system uses a three-tier fallback strategy:

1. **Current Language**: First tries to find translation for the selected language
2. **Default Language**: Falls back to the default language translation
3. **Original Content**: Finally uses the original title/content

## Usage Examples

### In Components

```typescript
import { useQuestionTranslation } from "@/hooks/catalog/useQuestionTranslations";

function QuestionComponent({ question }) {
  const { getTranslatedQuestion } = useQuestionTranslation();
  const translatedContent = getTranslatedQuestion(question);

  return <h3>{translatedContent.title}</h3>;
}
```

### Direct Utility Usage

```typescript
import { getTranslatedQuestionTitle } from "@/utils/questionTranslationUtils";
import { useAtomValue } from "jotai";
import { currentLanguageObjectAtom } from "@/store/atoms";

function MyComponent({ question }) {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  const title = getTranslatedQuestionTitle(question, currentLanguage);

  return <span>{title}</span>;
}
```

## Backend Integration

The system expects the backend to provide questions with translations. The API should return:

```json
{
  "id": 1,
  "title": "What is the condition?",
  "translations": [
    {
      "language_id": 1,
      "title": "What is the condition?",
      "language": { "code": "en", "is_default": true }
    },
    {
      "language_id": 2,
      "title": "Wat is de conditie?",
      "language": { "code": "nl", "is_default": false }
    }
  ],
  "options": [
    {
      "id": 1,
      "title": "Excellent",
      "translations": [
        {
          "language_id": 1,
          "title": "Excellent",
          "language": { "code": "en" }
        },
        {
          "language_id": 2,
          "title": "Uitstekend",
          "language": { "code": "nl" }
        }
      ]
    }
  ]
}
```

## Testing

The translation system can be tested by:

1. Changing the language selection in the UI
2. Verifying that questions and options update to the selected language
3. Testing fallback behavior when translations are missing
4. Ensuring the system gracefully handles missing translation data

## Performance Considerations

- Translations are processed in `useMemo` to avoid unnecessary re-computations
- The system only re-processes when the language or question data changes
- Fallback logic is optimized to minimize lookups

## Troubleshooting

### Common Issues

1. **Questions not translating**: Check that the backend is providing translations in the expected format
2. **Fallback not working**: Verify that the default language is properly marked in the language data
3. **Performance issues**: Ensure components using translations are properly memoized

### Debug Tips

- Use browser dev tools to inspect the question data structure
- Check the current language atom value
- Verify translation arrays contain the expected language codes
