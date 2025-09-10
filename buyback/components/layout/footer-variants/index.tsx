"use client";

import Link from "next/link";
import Image from "next/image";
import { ShopConfig, TranslatableText } from "@/types/shop";
import { getLocalizedText } from "@/utils/localization";

// Common props for all footer variants
export interface FooterVariantProps {
  shopConfig: ShopConfig;
  currentLocale: string;
  fallbackLocale: string;
  currentYear: number;
  footerLinks: Array<{
    title: string;
    titleColor?: string;
    links: Array<{
      label: string;
      url: string;
      isExternal?: boolean;
      icon?: string;
    }>;
  }>;
}

/**
 * Default Footer Variant - Comprehensive layout with multiple columns
 */
export function DefaultFooter({
  shopConfig,
  currentLocale,
  fallbackLocale,
  currentYear,
  footerLinks,
}: FooterVariantProps) {
  // Helper function to render the company info section
  const renderCompanyInfo = () => {
    const footerConfig = shopConfig.footerConfig || {};
    const getLogoPositionClass = () => {
      switch (footerConfig.logoPosition) {
        case 'center': return 'flex justify-center w-full';
        case 'right': return 'flex justify-end w-full';
        default: return 'flex justify-start w-full';
      }
    };

    return (
      <div className="flex flex-col gap-4">
        {footerConfig.showLogo !== false && (
          <div className={`${getLogoPositionClass()}`}>
            <Link href="/">
              {shopConfig.logoUrl && (
                <Image 
                  src={shopConfig.logoUrl} 
                  alt={shopConfig.shopName} 
                  width={120} 
                  height={40} 
                  className="object-contain"
                />
              )}
            </Link>
          </div>
        )}
        <h4 className="text-lg font-semibold">{shopConfig.shopName}</h4>
        {footerConfig.companyDescription && (
          <p className="text-sm">
            {getLocalizedText(footerConfig.companyDescription, currentLocale, fallbackLocale)}
          </p>
        )}
        {!footerConfig.companyDescription && (
          <p className="text-sm">
            The easiest way to sell your used electronics for the best price.
          </p>
        )}
        {shopConfig.contactInfo && renderContactInfo()}
      </div>
    );
  };

  // Helper function to render contact information
  const renderContactInfo = () => {
    return (
      <div className="text-sm space-y-2">
        {shopConfig.contactInfo?.phone && (
          <p>
            <span className="inline-block w-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </span>
            {shopConfig.contactInfo.phone}
          </p>
        )}
        {shopConfig.contactInfo?.email && (
          <p>
            <span className="inline-block w-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            {shopConfig.contactInfo.email}
          </p>
        )}
        {shopConfig.contactInfo?.address && (
          <p>
            <span className="inline-block w-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            {shopConfig.contactInfo.address}
          </p>
        )}
      </div>
    );
  };
  
  // Helper function to render social media links
  const renderSocialMediaLinks = () => {
    const hasSocialMedia = shopConfig.socialMedia && (
      shopConfig.socialMedia.facebook || 
      shopConfig.socialMedia.twitter || 
      shopConfig.socialMedia.instagram || 
      shopConfig.socialMedia.linkedin
    );
    
    if (!hasSocialMedia) return null;
    
    return (
      <div className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold">Connect With Us</h4>
        <div className="flex space-x-4">
          {shopConfig.socialMedia?.facebook && (
            <Link href={shopConfig.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <span className="sr-only">Facebook</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: shopConfig.theme.primary }}>
                <span className="text-white text-xs">FB</span>
              </div>
            </Link>
          )}
          {shopConfig.socialMedia?.twitter && (
            <Link href={shopConfig.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <span className="sr-only">Twitter</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: shopConfig.theme.primary }}>
                <span className="text-white text-xs">TW</span>
              </div>
            </Link>
          )}
          {shopConfig.socialMedia?.instagram && (
            <Link href={shopConfig.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <span className="sr-only">Instagram</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: shopConfig.theme.primary }}>
                <span className="text-white text-xs">IG</span>
              </div>
            </Link>
          )}
          {shopConfig.socialMedia?.linkedin && (
            <Link href={shopConfig.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <span className="sr-only">LinkedIn</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: shopConfig.theme.primary }}>
                <span className="text-white text-xs">LI</span>
              </div>
            </Link>
          )}
        </div>
      </div>
    );
  };
  
  // Helper function to render the copyright section
  const renderCopyrightSection = () => {
    const footerConfig = shopConfig.footerConfig || {};
    if (footerConfig.showCopyright === false) return null;
    
    const copyrightText = footerConfig.copyrightText 
      ? getLocalizedText(footerConfig.copyrightText, currentLocale, fallbackLocale)
      : `© ${currentYear} ${shopConfig.shopName}. All rights reserved.`;
      
    return (
      <div className="mt-8 pt-8 border-t border-gray-200 text-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p>{copyrightText}</p>
          <p className="text-xs text-gray-500">
            Powered by <span className="font-medium">Cirtek</span>
          </p>
        </div>
      </div>
    );
  };
  
  // Get the appropriate grid columns based on the content
  const getGridColumns = () => {
    const linksCount = footerLinks && Array.isArray(footerLinks) ? footerLinks.length : 0;
    const hasSocialMedia = shopConfig.socialMedia && (
      shopConfig.socialMedia.facebook || 
      shopConfig.socialMedia.twitter || 
      shopConfig.socialMedia.instagram || 
      shopConfig.socialMedia.linkedin
    );
    
    const totalColumns = 1 + linksCount + (hasSocialMedia ? 1 : 0);
    
    if (totalColumns <= 3) return 'grid-cols-1 md:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  };

  return (
    <div className="container mx-auto px-4">
      <div className={`grid ${getGridColumns()} gap-8`}>
        {/* Company Info */}
        {renderCompanyInfo()}

        {/* Footer Links */}
        {footerLinks.map((section, index) => (
          <div key={index} className="flex flex-col gap-4">
            <h4 
              className="text-lg font-semibold" 
              style={{ color: section.titleColor || 'inherit' }}
            >
              {section.title}
            </h4>
            <ul className="space-y-2">
              {section.links.map((link, linkIndex) => (
                <li key={linkIndex}>
                  <Link 
                    href={link.url} 
                    className="text-sm hover:underline flex items-center gap-2"
                    {...(link.isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {link.icon && (
                      <span className="inline-block w-4 h-4">
                        <span className="text-xs">{link.icon}</span>
                      </span>
                    )}
                    {link.label}
                    {link.isExternal && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Social Media Links */}
        {renderSocialMediaLinks()}
      </div>

      {/* Copyright Section */}
      {renderCopyrightSection()}
    </div>
  );
}

/**
 * Minimal Footer Variant - Simplified footer with essential elements
 */
export function MinimalFooter({
  shopConfig,
  currentLocale,
  fallbackLocale,
  currentYear,
  footerLinks,
}: FooterVariantProps) {
  const footerConfig = shopConfig.footerConfig || {};
  
  // Simplify footer links by taking only the first section or creating a default
  const primaryLinks = footerLinks.length > 0 
    ? footerLinks[0].links 
    : [{ label: "Home", url: "/" }];

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Logo and copyright in one section */}
        <div className="flex flex-col items-center md:items-start gap-2">
          {footerConfig.showLogo !== false && shopConfig.logoUrl && (
            <Link href="/">
              <Image 
                src={shopConfig.logoUrl} 
                alt={shopConfig.shopName} 
                width={100} 
                height={32} 
                className="object-contain"
              />
            </Link>
          )}
          {footerConfig.showCopyright !== false && (
            <p className="text-sm text-center md:text-left">
              {footerConfig.copyrightText 
                ? getLocalizedText(footerConfig.copyrightText, currentLocale, fallbackLocale)
                : `© ${currentYear} ${shopConfig.shopName}. All rights reserved.`}
            </p>
          )}
        </div>

        {/* Links as a horizontal row */}
        <div className="flex flex-col items-center md:items-end gap-2">
          <div className="flex flex-wrap justify-center gap-6">
            {primaryLinks.map((link, index) => (
              <Link 
                key={index}
                href={link.url} 
                className="text-sm hover:underline flex items-center gap-1"
                {...(link.isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {link.label}
                {link.isExternal && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Powered by <span className="font-medium">Cirtek</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Expanded Footer Variant - Feature-rich footer with multiple sections and enhanced styling
 */
export function ExpandedFooter({
  shopConfig,
  currentLocale,
  fallbackLocale,
  currentYear,
  footerLinks,
}: FooterVariantProps) {
  // Helper function to render the company info section with more details
  const renderCompanyInfo = () => {
    const footerConfig = shopConfig.footerConfig || {};
    return (
      <div className="flex flex-col gap-5 p-6 bg-gray-50 rounded-lg">
        {footerConfig.showLogo !== false && shopConfig.logoUrl && (
          <Link href="/">
            <Image 
              src={shopConfig.logoUrl} 
              alt={shopConfig.shopName} 
              width={140} 
              height={50} 
              className="object-contain"
            />
          </Link>
        )}
        <h4 className="text-xl font-bold">{shopConfig.shopName}</h4>
        {footerConfig.companyDescription && (
          <p className="text-sm leading-relaxed">
            {getLocalizedText(footerConfig.companyDescription, currentLocale, fallbackLocale)}
          </p>
        )}
        {!footerConfig.companyDescription && (
          <p className="text-sm leading-relaxed">
            The easiest way to sell your used electronics for the best price. Fast payments, free shipping, and top-notch customer service.
          </p>
        )}
        {shopConfig.contactInfo && renderContactInfo()}
      </div>
    );
  };

  // Helper function to render contact information with enhanced styling
  const renderContactInfo = () => {
    return (
      <div className="text-sm space-y-3 mt-2">
        {shopConfig.contactInfo?.phone && (
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-full bg-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </span>
            <div>
              <p className="font-medium">Phone</p>
              <p>{shopConfig.contactInfo.phone}</p>
            </div>
          </div>
        )}
        {shopConfig.contactInfo?.email && (
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-full bg-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <div>
              <p className="font-medium">Email</p>
              <p>{shopConfig.contactInfo.email}</p>
            </div>
          </div>
        )}
        {shopConfig.contactInfo?.address && (
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-full bg-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <div>
              <p className="font-medium">Address</p>
              <p>{shopConfig.contactInfo.address}</p>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Helper function to render social media links with enhanced styling
  const renderSocialMediaLinks = () => {
    const hasSocialMedia = shopConfig.socialMedia && (
      shopConfig.socialMedia.facebook || 
      shopConfig.socialMedia.twitter || 
      shopConfig.socialMedia.instagram || 
      shopConfig.socialMedia.linkedin
    );
    
    if (!hasSocialMedia) return null;
    
    return (
      <div className="mt-6">
        <h4 className="text-lg font-bold mb-4">Connect With Us</h4>
        <div className="flex flex-wrap gap-4">
          {shopConfig.socialMedia?.facebook && (
            <Link href={shopConfig.socialMedia.facebook} target="_blank" rel="noopener noreferrer" 
              className="hover:opacity-80 transition-all transform hover:scale-110">
              <span className="sr-only">Facebook</span>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md" 
                style={{ backgroundColor: shopConfig.theme.primary }}>
                <span className="text-white font-medium">FB</span>
              </div>
            </Link>
          )}
          {shopConfig.socialMedia?.twitter && (
            <Link href={shopConfig.socialMedia.twitter} target="_blank" rel="noopener noreferrer" 
              className="hover:opacity-80 transition-all transform hover:scale-110">
              <span className="sr-only">Twitter</span>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md" 
                style={{ backgroundColor: shopConfig.theme.primary }}>
                <span className="text-white font-medium">TW</span>
              </div>
            </Link>
          )}
          {shopConfig.socialMedia?.instagram && (
            <Link href={shopConfig.socialMedia.instagram} target="_blank" rel="noopener noreferrer" 
              className="hover:opacity-80 transition-all transform hover:scale-110">
              <span className="sr-only">Instagram</span>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md" 
                style={{ backgroundColor: shopConfig.theme.primary }}>
                <span className="text-white font-medium">IG</span>
              </div>
            </Link>
          )}
          {shopConfig.socialMedia?.linkedin && (
            <Link href={shopConfig.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" 
              className="hover:opacity-80 transition-all transform hover:scale-110">
              <span className="sr-only">LinkedIn</span>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md" 
                style={{ backgroundColor: shopConfig.theme.primary }}>
                <span className="text-white font-medium">LI</span>
              </div>
            </Link>
          )}
        </div>
      </div>
    );
  };
  
  // Helper function to render the copyright section with enhanced styling
  const renderCopyrightSection = () => {
    const footerConfig = shopConfig.footerConfig || {};
    if (footerConfig.showCopyright === false) return null;
    
    const copyrightText = footerConfig.copyrightText 
      ? getLocalizedText(footerConfig.copyrightText, currentLocale, fallbackLocale)
      : `© ${currentYear} ${shopConfig.shopName}. All rights reserved.`;
      
    return (
      <div className="mt-10 pt-8 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">{copyrightText}</p>
          <p className="text-xs text-gray-500">
            Powered by <span className="font-medium">Cirtek</span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Company Info Section - 4 columns */}
        <div className="lg:col-span-4">
          {renderCompanyInfo()}
          {renderSocialMediaLinks()}
        </div>

        {/* Footer Links - 8 columns */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {footerLinks.map((section, index) => (
              <div key={index} className="flex flex-col gap-4">
                <h4 
                  className="text-lg font-bold" 
                  style={{ color: section.titleColor || 'inherit' }}
                >
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link 
                        href={link.url} 
                        className="text-sm hover:underline hover:text-primary transition-colors flex items-center gap-2"
                        {...(link.isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {link.icon && (
                          <span className="inline-block w-4 h-4">
                            <span className="text-xs">{link.icon}</span>
                          </span>
                        )}
                        {link.label}
                        {link.isExternal && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright Section */}
      {renderCopyrightSection()}
    </div>
  );
}

import { FooterVariant4, defaultFooterVariant4Props, type FooterVariant4Props } from "./FooterVariant4"; // Added for Variant 4

// Map of footer variants
export const FooterVariants: Record<string, React.FC<any>> = { // Changed to React.FC<any> to support different prop types
  default: DefaultFooter,
  minimal: MinimalFooter,
  expanded: ExpandedFooter,
  variant4: FooterVariant4, // Added Variant 4
};

// Export the footer variant type
export type FooterVariantType = keyof typeof FooterVariants;

export { defaultFooterVariant4Props }; // Export default props for V4
export type { FooterVariant4Props }; // Export props type for V4
