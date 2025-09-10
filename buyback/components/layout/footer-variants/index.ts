import React from 'react';
import type { ShopConfig } from '@/types/shop';
import type { FooterVariant4Props as FV4Props } from './FooterVariant4';
import { FooterVariant4, defaultFooterVariant4Props as dfv4Props } from './FooterVariant4';

// Placeholder for FooterLinkSection - replace with actual import or definition from @/types/shop
export interface FooterLink {
  label: string | { [key: string]: string };
  url: string;
  isExternal?: boolean;
  icon?: string;
}
export interface FooterLinkSection {
  title: string | { [key: string]: string };
  links: FooterLink[];
  titleColor?: string;
}

export interface CommonFooterVariantProps {
  shopConfig: ShopConfig;
  currentLocale: string;
  fallbackLocale: string;
  currentYear: number;
  footerLinks: FooterLinkSection[];
  backgroundColor?: string;
  textColor?: string;
}

// Placeholder components returning null to avoid JSX issues in .ts file
const FooterVariantDefault: React.FC<CommonFooterVariantProps> = (props) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('FooterVariantDefault is a placeholder:', props);
  }
  return null;
};

const FooterVariantMinimal: React.FC<CommonFooterVariantProps> = (props) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('FooterVariantMinimal is a placeholder:', props);
  }
  return null;
};

const FooterVariantExpanded: React.FC<CommonFooterVariantProps> = (props) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('FooterVariantExpanded is a placeholder:', props);
  }
  return null;
};

export type FooterVariantType = 'default' | 'minimal' | 'expanded' | 'variant4';

export const FooterVariants: Record<FooterVariantType, React.FC<any>> = {
  default: FooterVariantDefault,
  minimal: FooterVariantMinimal,
  expanded: FooterVariantExpanded,
  variant4: FooterVariant4, // Actual component
};

export { dfv4Props as defaultFooterVariant4Props };
export type { FV4Props as FooterVariant4Props };
// CommonFooterVariantProps and FooterLinkSection are also implicitly exported by their usage in exported types/components if needed elsewhere


