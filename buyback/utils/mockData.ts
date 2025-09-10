import { ModelListItemType } from '@/types/shop';

const NEW_IMAGE_URL = 'https://www.apple.com/newsroom/images/product/iphone/standard/Apple-iPhone-14-Pro-iPhone-14-Pro-Max-hero-220907_Full-Bleed-Image.jpg.large.jpg';

export const MOCK_MODELS_ALL: ModelListItemType[] = [
  {
    id: 'iphone-15-pro',
    name: { en: 'iPhone 15 Pro', es: 'iPhone 15 Pro ES' },
    description: { en: 'The ultimate iPhone experience.', es: 'La experiencia iPhone definitiva.' },
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Smartphones',
    brandName: 'Apple',
    detailsLink: '/en/sell/iphone-15-pro/estimate'
  },
  {
    id: 'samsung-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Experience the new era of mobile AI.',
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Smartphones',
    brandName: 'Samsung',
    detailsLink: '/en/sell/samsung-s24-ultra/estimate'
  },
  {
    id: 'pixel-8-pro',
    name: { en: 'Google Pixel 8 Pro' },
    description: 'The most helpful Pixel yet, with Google AI.',
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Smartphones',
    brandName: 'Google',
    detailsLink: '/en/sell/pixel-8-pro/estimate'
  },
  {
    id: 'macbook-air-m3',
    name: { en: 'MacBook Air 13" (M3)' },
    description: { en: 'Impressively big sound, impossibly thin design.' },
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Laptops',
    brandName: 'Apple',
    detailsLink: '/en/sell/macbook-air-m3/estimate'
  },
  {
    id: 'ipad-air-m2',
    name: { en: 'iPad Air (M2)' },
    description: { en: 'Serious performance in a thin and light design.' },
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Tablets',
    brandName: 'Apple',
    detailsLink: '/en/sell/ipad-air-m2/estimate'
  },
  {
    id: 'sony-wh-1000xm5',
    name: { en: 'Sony WH-1000XM5' },
    description: { en: 'Industry-leading noise canceling headphones.' },
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Headphones', 
    brandName: 'Sony',
    detailsLink: '/en/sell/sony-wh-1000xm5/estimate'
  },
  {
    id: 'apple-watch-s9',
    name: { en: 'Apple Watch Series 9' },
    description: { en: 'Smarter. Brighter. Mighter.' },
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Smartwatches',
    brandName: 'Apple',
    detailsLink: '/en/sell/apple-watch-s9/estimate'
  },
  {
    id: 'iphone-14-pro',
    name: { en: 'iPhone 14 Pro' },
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Smartphones',
    brandName: 'Apple',
    detailsLink: '/en/sell/iphone-14-pro/estimate'
  },
  {
    id: 'macbook-pro-14-m3',
    name: { en: 'MacBook Pro 14" (M3)' },
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Laptops',
    brandName: 'Apple',
    detailsLink: '/en/sell/macbook-pro-14-m3/estimate'
  },
  {
    id: 'ipad-pro-m4',
    name: { en: 'iPad Pro 11" (M4)' },
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Tablets',
    brandName: 'Apple',
    detailsLink: '/en/sell/ipad-pro-m4/estimate'
  },
  {
    id: 'galaxy-watch-6',
    name: { en: 'Samsung Galaxy Watch 6' },
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Smartwatches',
    brandName: 'Samsung',
    detailsLink: '/en/sell/galaxy-watch-6/estimate'
  },
  {
    id: 'iphone-15',
    name: { en: 'iPhone 15' },
    description: { en: 'Newphoria.' },
    imageUrl: NEW_IMAGE_URL,
    categoryName: 'Smartphones',
    brandName: 'Apple',
    detailsLink: '/en/sell/iphone-15/estimate'
  }
]; 