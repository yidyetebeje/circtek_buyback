import { SkuPropertyKey } from '../models/sku-mapping';

export const SKU_PROPERTY_OPTIONS: Record<Exclude<SkuPropertyKey, 'grade' | 'battery_cycle_count' | 'battery_health'>, string[]> = {
  make: [
    'Apple',
    'Samsung', 
    'Google',
    'OnePlus',
    'Huawei',
    'Xiaomi',
    'Sony',
    'LG',
    'Motorola',
    'Nokia'
  ],
  model_name: [
    // iPhone X Series
    'iPhone X',
    'iPhone XR',
    'iPhone XS',
    'iPhone XS Max',
    // iPhone 11 Series
    'iPhone 11',
    'iPhone 11 Pro',
    'iPhone 11 Pro Max',
    // iPhone 12 Series
    'iPhone 12',
    'iPhone 12 Mini',
    'iPhone 12 Pro',
    'iPhone 12 Pro Max',
    // iPhone 13 Series
    'iPhone 13',
    'iPhone 13 Mini',
    'iPhone 13 Pro',
    'iPhone 13 Pro Max',
    // iPhone 14 Series
    'iPhone 14',
    'iPhone 14 Plus',
    'iPhone 14 Pro',
    'iPhone 14 Pro Max',
    // iPhone 15 Series
    'iPhone 15',
    'iPhone 15 Plus',
    'iPhone 15 Pro',
    'iPhone 15 Pro Max',
    // iPhone 16 Series
    'iPhone 16',
    'iPhone 16 Plus',
    'iPhone 16 Pro',
    'iPhone 16 Pro Max',
    // iPhone 17 Series (2025)
    'iPhone 17',
    'iPhone 17 Plus',
    'iPhone 17 Pro',
    'iPhone 17 Pro Max',
    'iPhone 17 Air',
    // iPhone SE
    'iPhone SE (2nd generation)',
    'iPhone SE (3rd generation)',
    'iPhone SE (4th generation)'
  ],
  storage: [
    '32',
    '64',
    '128',
    '256',
    '512',
    '1024'
  ],
  original_color: [
    // Standard Colors
    'Black',
    'White',
    'Silver',
    'Gold',
    'Rose Gold',
    'Space Gray',
    'Space Black',
    // iPhone X/XR/XS Colors
    'Coral',
    // iPhone 11 Colors
    'Midnight Green',
    'Purple',
    'Yellow',
    'Green',
    'Lavender',
    // iPhone 12 Colors
    'Blue',
    'Pacific Blue',
    'Graphite',
    'Navy',
    'Red',
    'Product Red',
    '(PRODUCT)RED',
    // iPhone 13 Colors
    'Pink',
    'Starlight',
    'Midnight',
    'Alpine Green',
    'Sierra Blue',
    // iPhone 14 Colors
    'Deep Purple',
    'Gold Purple',
    // iPhone 15 Colors
    'Blue Titanium',
    'Natural Titanium',
    'White Titanium',
    'Black Titanium',
    // iPhone 16 Colors
    'Ultramarine',
    'Teal',
    'Pink',
    'Desert Titanium',
    // Other Popular Colors
    'Jet Black',
    'Matte Black',
    'Glossy Black',
    'Ceramic White'
  ]
};

export const SKU_PROPERTY_LABELS: Record<SkuPropertyKey, string> = {
  make: 'Make',
  model_name: 'Model Name',
  storage: 'Storage',
  original_color: 'Original Color',
  grade: 'Grade',
  battery_cycle_count: 'Battery Cycle Count',
  battery_health: 'Battery Health'
};

export const SKU_PROPERTY_KEYS: SkuPropertyKey[] = [
  'make',
  'model_name', 
  'storage',
  'original_color',
  'grade',
  'battery_cycle_count',
  'battery_health'
];
