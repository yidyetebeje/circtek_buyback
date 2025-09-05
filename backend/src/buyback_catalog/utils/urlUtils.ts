/**
 * Utility functions for URL manipulation and formatting
 */

/**
 * Converts a string to a SEF (Search Engine Friendly) URL format by:
 * - Converting to lowercase
 * - Removing special characters
 * - Replacing spaces with hyphens
 * - Removing consecutive hyphens
 * - Removing leading and trailing hyphens
 * 
 * @param input The string to convert to a URL-safe format
 * @returns A URL-safe string
 */
export function toSafeUrl(input: string): string {
  if (!input) return '';
  
  return input
    .toString()
    .toLowerCase()                      // Convert to lowercase
    .trim()                             // Remove leading and trailing whitespace
    .normalize('NFD')                   // Normalize to decomposed form for handling accents
    .replace(/[\u0300-\u036f]/g, '')   // Remove diacritics/accents
    .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, '') // Remove special characters
    .replace(/\s+/g, '-')              // Replace spaces with hyphens
    .replace(/_+/g, '-')               // Replace underscores with hyphens
    .replace(/-+/g, '-')               // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')                // Remove leading hyphens
    .replace(/-+$/, '');               // Remove trailing hyphens
}
