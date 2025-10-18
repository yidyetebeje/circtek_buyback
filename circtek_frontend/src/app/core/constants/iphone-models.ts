/**
 * Comprehensive list of iPhone models from iPhone 11 onwards
 * Updated: 2025 - Includes iPhone 17 lineup
 */

export const IPHONE_MODELS = [
  // iPhone 11 Series (2019)
  'iPhone 11',
  'iPhone 11 Pro',
  'iPhone 11 Pro Max',

  // iPhone SE Series
  'iPhone SE (2nd generation)',
  'iPhone SE (3rd generation)',

  // iPhone 12 Series (2020)
  'iPhone 12 mini',
  'iPhone 12',
  'iPhone 12 Pro',
  'iPhone 12 Pro Max',

  // iPhone 13 Series (2021)
  'iPhone 13 mini',
  'iPhone 13',
  'iPhone 13 Pro',
  'iPhone 13 Pro Max',

  // iPhone 14 Series (2022)
  'iPhone 14',
  'iPhone 14 Plus',
  'iPhone 14 Pro',
  'iPhone 14 Pro Max',

  // iPhone 15 Series (2023)
  'iPhone 15',
  'iPhone 15 Plus',
  'iPhone 15 Pro',
  'iPhone 15 Pro Max',

  // iPhone 16 Series (2024)
  'iPhone 16',
  'iPhone 16 Plus',
  'iPhone 16 Pro',
  'iPhone 16 Pro Max',
  'iPhone 16e',

  // iPhone 17 Series (2025)
  'iPhone 17',
  'iPhone 17 Pro',
  'iPhone 17 Pro Max',
  'iPhone Air',
] as const;

export type IPhoneModel = typeof IPHONE_MODELS[number];
