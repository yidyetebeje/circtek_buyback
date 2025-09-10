# Language Feature Implementation

This document describes the comprehensive language management system implemented for the buyback application.

## Overview

The language system provides:

- **URL-based language persistence** - Language choice persists in URL and localStorage
- **Automatic language detection** - Based on geolocation, browser preferences, and fallbacks
- **Next.js internationalization integration** - Seamless integration with next-intl routing
- **API-driven language configuration** - Dynamic language support from backend API
- **Accessible UI components** - Keyboard navigation, ARIA labels, screen reader support

## Architecture

### Core Components

1. **Language State Management** (`store/atoms.ts`)

   - `availableLanguagesAtom` - Languages from API
   - `currentLanguageAtom` - Selected language with localStorage persistence
   - `languageLoadingAtom` - Loading state
   - `currentLanguageObjectAtom` - Computed current language object

2. **Language Hook** (`hooks/useLanguage.ts`)

   - `fetchLanguages()` - API integration
   - `changeLanguage()` - Language switching with URL navigation
   - `detectUserLanguage()` - Browser/location detection
   - `getLanguageFlag()` - Flag emoji mapping

3. **Language Provider** (`providers/LanguageProvider.tsx`)

   - System initialization
   - URL locale synchronization
   - Automatic detection coordination

4. **Language Selector** (`components/shared/LanguageSelector.tsx`)
   - Reusable dropdown component
   - Multiple size and style variants
   - Accessibility features

### Internationalization Setup

- **Routing Configuration** (`i18n/routing.ts`)

  - Supported locales: `['en', 'nl', 'de', 'es', 'pt', 'fr']`
  - Always-prefix routing for consistent URLs
  - Default locale: `'en'`

- **Message Files** (`messages/`)

  - JSON files for each supported locale
  - Structured translation keys
  - Fallback to English for missing translations

- **Middleware** (`middleware.ts`)
  - Handles locale routing
  - Admin authentication integration
  - API route exclusions

## Language Persistence

### URL-Based Persistence

When a user selects a language:

1. The URL immediately changes to include the locale prefix (e.g., `/en/`, `/nl/`)
2. The selection is saved to localStorage as backup
3. Next.js routing handles the page transition

### Persistence Priority

1. **URL locale** - Takes precedence over all other sources
2. **localStorage** - Used when no URL locale or on direct visits
3. **Geolocation detection** - Based on user's country
4. **Browser language** - From `navigator.languages`
5. **API default** - From backend language configuration
6. **Fallback** - English as final fallback

## Usage Examples

### Basic Language Selector

```tsx
import { LanguageSelector } from "@/components/shared/LanguageSelector";

export function Header() {
  return (
    <header>
      <LanguageSelector size="sm" variant="minimal" />
    </header>
  );
}
```

### With Language Name Display

```tsx
<LanguageSelector
  size="md"
  variant="outlined"
  showName={true}
  showChevron={true}
/>
```

### Custom Styling

```tsx
<LanguageSelector
  variant="filled"
  className="rounded-full"
  textColor="#ffffff"
/>
```

### Programmatic Language Changes

```tsx
import { useLanguage } from "@/hooks/useLanguage";

export function CustomLanguageControl() {
  const { changeLanguage, availableLanguages } = useLanguage();

  const handleLanguageChange = (code: string) => {
    changeLanguage(code); // This will update URL and localStorage
  };

  return (
    <select onChange={(e) => handleLanguageChange(e.target.value)}>
      {availableLanguages.map((lang) => (
        <option key={lang.id} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
}
```

## API Integration

### Language API Endpoint

```
GET /api/catalog/languages?limit=50
```

**Response Format:**

```json
{
  "data": [
    {
      "id": 1,
      "code": "en",
      "name": "English",
      "is_default": 1,
      "is_active": 1
    }
  ]
}
```

### Fallback Data

If the API is unavailable, the system uses fallback languages:

- English (default)
- Dutch
- French
- German

## Location-Based Detection

The system uses the browser's geolocation API to detect the user's country and suggest an appropriate language:

```javascript
const countryToLanguageMap = {
  nl: "nl", // Netherlands → Dutch
  be: "nl", // Belgium → Dutch
  de: "de", // Germany → German
  at: "de", // Austria → German
  fr: "fr", // France → French
  us: "en", // United States → English
  gb: "en", // United Kingdom → English
  // ... more mappings
};
```

## Accessibility Features

- **ARIA Labels** - Proper labeling for screen readers
- **Keyboard Navigation** - Full keyboard support
- **Focus Management** - Visible focus indicators
- **Screen Reader Support** - Announces language changes
- **High Contrast** - Works with browser accessibility modes

## Browser Compatibility

- **Modern Browsers** - Chrome 60+, Firefox 55+, Safari 12+
- **Geolocation** - Graceful degradation when not available
- **localStorage** - Fallback to session-only storage in private mode
- **JavaScript Required** - Progressive enhancement pattern

## Troubleshooting

### Language Not Persisting

1. Check if localStorage is enabled
2. Verify URL includes locale prefix
3. Check browser console for errors
4. Ensure API endpoint is accessible

### Wrong Language Detected

1. Check browser language settings
2. Verify geolocation permissions
3. Manually select preferred language
4. Check API language configuration

### Translation Missing

1. Verify message files exist for locale
2. Check translation key structure
3. Use English fallback for missing keys
4. Check next-intl configuration

## Performance Considerations

- **API Caching** - Languages cached in localStorage
- **Bundle Splitting** - Message files loaded on demand
- **Code Splitting** - Language components lazy-loaded
- **Memory Usage** - Minimal state management overhead

## Security Considerations

- **Input Validation** - Language codes validated against API
- **XSS Prevention** - Translation strings properly escaped
- **CSRF Protection** - API calls include proper headers
- **Content Security Policy** - Compatible with CSP restrictions

## Development Setup

1. **Install Dependencies**

   ```bash
   npm install jotai next-intl
   ```

2. **Configure Environment**

   ```env
   NEXT_PUBLIC_API_URL=your-api-url
   ```

3. **Add Message Files**

   - Create JSON files in `messages/` directory
   - Follow the key structure from `en.json`

4. **Integration**

   ```tsx
   // Add to your layout
   import { LanguageProvider } from "@/providers/LanguageProvider";

   export default function Layout({ children }) {
     return <LanguageProvider>{children}</LanguageProvider>;
   }
   ```

## Future Enhancements

- **RTL Support** - Right-to-left language support
- **Voice Control** - Voice-activated language switching
- **Regional Variants** - Support for regional language differences
- **Translation Management** - Admin interface for managing translations
- **Performance Monitoring** - Analytics for language usage patterns
