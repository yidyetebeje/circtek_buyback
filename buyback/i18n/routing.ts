import {defineRouting} from 'next-intl/routing';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'nl', 'de', 'es', 'pt', 'fr'],
 
  // Used when no locale matches
  defaultLocale: 'en',
  
  // Optional: Use prefix routing for all locales including default
  localePrefix: 'always'
});