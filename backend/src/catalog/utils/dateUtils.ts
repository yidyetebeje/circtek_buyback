/**
 * Utility functions for date and time formatting
 */

/**
 * Converts a JavaScript Date to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
 * @param date - The date to convert. If not provided, uses current date/time
 * @returns MySQL datetime formatted string
 */
export function toMySQLDateTime(date?: Date): string {
  const targetDate = date || new Date();
  return targetDate.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Gets current timestamp in MySQL datetime format
 * @returns Current timestamp as MySQL datetime formatted string
 */
export function getCurrentMySQLDateTime(): string {
  return toMySQLDateTime();
} 