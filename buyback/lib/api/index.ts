/**
 * Main API export file
 * Re-exports all API services from a single location
 */

// Base API classes
export * from './base';
export * from './types';

// Re-export all services from catalog
export * from './catalog/shopLocationService';
export * from './catalog/shopService';
export * from './catalog/brandService';
export * from './catalog/categoryService';
export * from './catalog/modelService';
export * from './catalog/modelSeriesService';
export * from './catalog/shopCatalogService';
export * from './catalog/shopModelPriceService';
export * from './catalog/faqService';
export * from './catalog/aiTranslationService';
export * from './catalog/languageService';
export * from './catalog/userShopAccessService';
export * from './catalog/statsService';
export * from './catalog/deviceQuestionSetService';
export * from './catalog/categoryUtils';
export * from './catalog/featuredDeviceService';

// Other services
export * from './emailTemplateService';
export * from './orderService';
export * from './userService'; 
export * from './warehouseService';
export * from './stockService';
export * from './backMarketService';