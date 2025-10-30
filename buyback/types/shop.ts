/**
 * Type definitions for shop configuration
 * Used for customizing the appearance and content of shop homepages
 */

import { CategoryType, CategoryVariantType } from "@/components/homepage/category-variants";
import { HeaderVariantType } from '@/components/layout/header-variants';
import type { FooterVariant4Props } from '@/components/layout/footer-variants'; // Added for FooterVariant4
import { HeroVariantType } from '@/components/config/HeroVariantSelector';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface DesignSystem {
  borderRadius: {
    button: string;
    card: string;
    input: string;
  };
  spacing: {
    sectionPadding: string;
  };
  layout: 'default' | 'compact' | 'spacious';
  darkMode: boolean;
}

// Base hero section fields that all variants share
export interface HeroSection {
  title: string;
  subtitle: string;
  description?: string;
  backgroundImage: string;
  buttonText: string;
  buttonLink: string;
  variant?: HeroVariantType;
  
  // Variant-specific fields
  // Default hero specific fields
  tagline?: string;  // For the small tag above the headline (e.g., "Trade In. Cash Out.")
  
  // Split hero specific fields
  featuredDevices?: {
    name: string;
    price: string;
    image: string;
  }[];
  
  // Centered hero specific fields
  trustBadge?: string; // The text in the badge (e.g., "Trusted by 10,000+ customers")
  stats?: {
    label: string;
    value: string;
  }[];
  
  // Gradient hero specific fields
  gradientStart?: string;
  gradientEnd?: string;
  trustIndicators?: {
    label: string;
    icon?: string;
  }[];
  
  // Minimalist hero specific fields
  taglineBefore?: string;
  priceLabels?: {
    name: string;
    price: string;
  }[];
  
  // Video hero specific fields
  videoUrl?: string;
  liveBadgeText?: string;
  
  // Simple hero specific fields
  backgroundColor?: string;
  
  // Translation support
  translations?: {
    [locale: string]: {
      title?: string;
      subtitle?: string;
      description?: string;
      buttonText?: string;
      tagline?: string;
      trustBadge?: string;
      liveBadgeText?: string;
      taglineBefore?: string;
    }
  };
}

// Legacy Category interface - we will now use CategoryType from category-variants
export interface Category {
  id: number;
  name: string;
  description?: string;
  imageUrl: string;
  link: string;
}

export interface SectionOrdering {
  categories: number;
  featuredProducts: number;
  testimonials: number;
  partners: number;
  faq?: number;
  stepProcess?: number;
  globalEarth?: number;
  feedback?: number;
  help?: number;
}

export type TranslatableText = {
  [locale: string]: string;
};

export interface BenefitItem {
  id: string;
  text: string;
  icon: string;
}

export interface BenefitsConfig {
  items: BenefitItem[];
  alignment: 'left' | 'center' | 'right' | 'space-between' | 'space-around';
  backgroundColor: string;
  textColor: string;
  iconColor: string;
  showBenefits: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQConfig {
  showFAQ: boolean;
  title: TranslatableText;
  subtitle?: TranslatableText;
}

export interface NavigationConfig {
  showNavbar: boolean;
  links?: Array<{ label: string; url: string; targetSection?: string }>;
}

// Configuration for category variant texts
export interface CategoryTextConfig {
  getQuote?: TranslatableText;
  viewAll?: TranslatableText;
  viewDevices?: TranslatableText;
  sellDevice?: TranslatableText; // Will use {deviceName} placeholder
  sellYourDevice?: TranslatableText;
  browseCategories?: TranslatableText;
  discoverDeviceValue?: TranslatableText;
  selectDeviceCategory?: TranslatableText;
  sellDevicesWithEase?: TranslatableText;
  scrollThroughDevices?: TranslatableText;
  turnInSellMoney?: TranslatableText;
  chooseWideRange?: TranslatableText;
  chooseFromSelection?: TranslatableText;
  findDeviceType?: TranslatableText;
  selectDeviceToStart?: TranslatableText;
  viewAllModels?: TranslatableText;
  sellPhones?: TranslatableText;
  sellTablets?: TranslatableText;
}

export interface StepProcessConfig {
  step1Title?: TranslatableText;
  step1Description?: TranslatableText;
  step2Title?: TranslatableText;
  step2Description?: TranslatableText;
  step3Title?: TranslatableText;
  step3Description?: TranslatableText;
  backgroundColor?: string;
  textColor?: string;
  numberColor?: string;
}

export interface HelpConfig {
  title?: TranslatableText;
  subtitle?: TranslatableText;
  whatsapp?: TranslatableText;
  email?: TranslatableText;
  stores?: TranslatableText;
  comeVisit?: TranslatableText;
}

export interface FeedbackConfig {
  title?: TranslatableText;
  altLogo?: TranslatableText;
  ariaPrev?: TranslatableText;
  ariaNext?: TranslatableText;
  // Review texts
  review1Text?: TranslatableText;
  review1Reviewer?: TranslatableText;
  review2Text?: TranslatableText;
  review2Reviewer?: TranslatableText;
  review3Text?: TranslatableText;
  review3Reviewer?: TranslatableText;
  review4Text?: TranslatableText;
  review4Reviewer?: TranslatableText;
  review5Text?: TranslatableText;
  review5Reviewer?: TranslatableText;
  review6Text?: TranslatableText;
  review6Reviewer?: TranslatableText;
}

export interface ThePhoneLabHeaderConfig {
  // Benefits bar items
  benefit1?: TranslatableText;
  benefit2?: TranslatableText;
  benefit3?: TranslatableText;
  // Navigation items
  repairs?: TranslatableText;
  stores?: TranslatableText;
}

export interface GlobalEarthConfig {
  heading?: TranslatableText;
  subheading?: TranslatableText;
  imageUrl?: string;
  imageAlt?: TranslatableText;
  backgroundColor?: string;
  textColor?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  whatsapp?: string; // For the raw WhatsApp number, e.g., 310850486104
  whatsappFormatted?: string; // For a display-friendly WhatsApp number, e.g., 085 048 6104
}

export interface ShopConfig {
  shopId: string;
  shopName: string;
  logoUrl: string;
  faviconUrl?: string;
  theme: ThemeColors;
  design?: DesignSystem;
  heroSection: HeroSection;
  categories: CategoryType[];
  sectionOrder?: SectionOrdering;
  showFeaturedProducts?: boolean;
  showTestimonials?: boolean;
  showPartners?: boolean;
  showHelp?: boolean;
  showStepProcess?: boolean;
  showGlobalEarth?: boolean;
  showFeedback?: boolean;
  categoryVariant?: CategoryVariantType;
  headerVariant?: HeaderVariantType;
  categorySectionTitle?: TranslatableText;
  categorySectionSubtitle?: TranslatableText;
  // Category text customization
  categoryTextConfig?: CategoryTextConfig;
  // Step Process section configuration
  stepProcessConfig?: StepProcessConfig;
  // Help section configuration
  helpConfig?: HelpConfig;
  // Feedback section configuration
  feedbackConfig?: FeedbackConfig;
  // ThePhoneLab header configuration
  thePhoneLabHeaderConfig?: ThePhoneLabHeaderConfig;
  // Global Earth section configuration
  globalEarthConfig?: GlobalEarthConfig;
  // Navigation configuration
  navigation?: NavigationConfig;
  contactInfo?: ContactInfo;
  // Benefits bar configuration
  benefits?: BenefitsConfig;
  // FAQ section configuration
  faq?: FAQConfig;
  // Footer configuration
  footerConfig?: {
    variant?: 'default' | 'minimal' | 'expanded' | 'variant4'; // Added variant4
    backgroundColor?: string;
    textColor?: string;
    showLogo?: boolean;
    logoPosition?: 'left' | 'center' | 'right';
    companyDescription?: TranslatableText;
    showCopyright?: boolean;
    variant4Options?: FooterVariant4Props; // Added options for FooterVariant4
    copyrightText?: TranslatableText;
  };
  footerLinks?: {
    title: string;
    titleColor?: string;
    links: Array<{ 
      label: string; 
      url: string;
      isExternal?: boolean;
      icon?: string;
    }>;
  }[];
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  // Model List Page Configuration
  modelListVariant?: 'classicElegant' | 'card' | 'grid' | 'minimalist' | 'featured' | 'gradientAccent' | 'centeredFocus' | 'splitView' | 'floating';
  deviceEstimationConfig?: DeviceEstimationConfig;
  // Checkout Page Configuration
  checkoutVariant?: 'default' | 'split' | 'minimalist' | 'stepped' | 'card';
  // Header style customization (background & text colors)
  /**
   * Optional per-header style overrides. These colors are used by the header
   * components (all variants) to paint their main background and text color.
   * If omitted, the components will fall back to their hard-coded defaults or
   * the global theme.
   */
  headerStyle?: {
    backgroundColor?: string;
    textColor?: string;
  };
  // End of ShopConfig interface
}

/**
 * Represents a single item in the model list.
 * Pricing information is intentionally omitted.
 */
export interface ModelListItemType {
  id: string;
  name: TranslatableText | string; // Name of the model, can be simple string or translatable
  imageUrl: string; // URL for the model's image
  description?: TranslatableText | string; // Optional short description
  categoryName?: string; // e.g., "Smartphones" - useful for context or breadcrumbs
  brandName?: string; // e.g., "Apple", "Samsung"
  detailsLink: string; // URL to the full product detail page
  base_price?: number; // Base price of the model, optional but displayed when available
  sef_url?: string; // SEF URL for the model, used for navigation
}

// Renaming ModelListItemType to DeviceInformation for clarity in this context, structure is similar
export interface DeviceInformation {
  id: string;
  name: TranslatableText | string;
  imageUrl: string;
  description?: TranslatableText | string;
  categoryName?: string;
  brandName?: string;
  // Add any other device-specific fields needed for the estimation page
  // For example, basePrice, specifications list etc.
}

export interface DeviceEstimationQuestion {
  id: string;
  text: TranslatableText | string;
  type: 'multiple-choice' | 'slider' | 'text-input'; // Example types
  options?: Array<{ label: TranslatableText | string; value: string; icon?: string; description?: TranslatableText | string }>;
  // Add other question-specific fields as needed, e.g. min/max for slider, regex for text-input
}

// Define variant types for the estimation page layout
export type DeviceEstimationVariantType = 
  | 'default'       // Standard two-column layout
  | 'compact-stepper' // Single column, info above stepper
  | 'image-prominent' // Emphasis on device image
  | 'minimal';      // Minimal UI with focus on device image only

export interface DeviceEstimationConfig {
  pageTitle?: TranslatableText;
  questions?: DeviceEstimationQuestion[];
  variant?: DeviceEstimationVariantType; // Added variant selection
  estimationResultTitle?: TranslatableText;
  checkoutButtonText?: TranslatableText;
}

// Definition for the type of component being edited in ComponentEditor
export type ComponentType = 
  | 'hero' 
  | 'categories' 
  | 'featuredProducts' 
  | 'testimonials' 
  | 'partners' 
  | 'header' 
  | 'modelList'
  | 'deviceEstimation'
  | 'checkout'
  | 'faq'
  | 'stepProcess'
  | 'globalEarth'
  | 'feedback'
  | 'help'
  | 'footer'
  | 'thePhoneLabHeader'; 

// Shop Location Types
export interface ShopLocation {
  id: number;
  shopId: number;
  name: string;
  address: string;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  operatingHours?: OperatingHours | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShopLocationPhone {
  id: number;
  locationId: number;
  phoneNumber: string;
  phoneType: 'main' | 'mobile' | 'fax' | 'whatsapp';
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopLocationWithPhones extends ShopLocation {
  phones: ShopLocationPhone[];
  distance?: number; // Optional field for nearby searches
}

export interface OperatingHours {
  [key: string]: {
    open: string;
    close: string;
    isClosed: boolean;
  };
}

export interface ShopLocationFormValues {
  name: string;
  address: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  latitude: number;
  longitude: number;
  description: string | null;
  operatingHours?: OperatingHours | null;
  isActive: boolean;
  displayOrder: number;
  phones: {
    id?: number;
    phoneNumber: string;
    phoneType: 'main' | 'mobile' | 'fax' | 'whatsapp';
    isPrimary: boolean;
  }[];
}

// End of Shop Location Types 