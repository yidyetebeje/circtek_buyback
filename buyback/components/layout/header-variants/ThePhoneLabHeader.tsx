"use client";

import Image from "next/image";
import Link from "next/link";
import { ShopConfig, TranslatableText } from "@/types/shop";
import { InProgressEstimation } from "@/store/atoms";
import { useState, useEffect } from "react";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { usePathname } from "next/navigation";

// Helper function to get localized text
const getLocalizedText = (textInput: TranslatableText | string | undefined, locale: string = 'en', defaultLocale: string = 'en'): string => {
  if (typeof textInput === 'string') return textInput;
  if (textInput && typeof textInput === 'object') {
    return textInput[locale] || textInput[defaultLocale] || textInput.en || Object.values(textInput)[0] || '';
  }
  return '';
};

// SVGs (can be moved to a separate icons file later)
const CartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);



const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.308 1.154a11.034 11.034 0 005.378 5.378l1.153-2.308a1 1 0 011.21-.502l4.493 1.498A1 1 0 0119 15.72V19a2 2 0 01-2 2h-1C6.015 21 3 17.985 3 10V5z" />
  </svg>
);

interface ThePhoneLabHeaderProps {
  shopConfig: ShopConfig;
  estimationCart?: InProgressEstimation[];
  currentLocale?: string;
}

export function ThePhoneLabHeader({ shopConfig, estimationCart, currentLocale = 'en' }: ThePhoneLabHeaderProps) {
  const { logoUrl, shopName } = shopConfig;
  const pathname = usePathname();
  
  // Get configurable content or fallback to defaults
  const headerConfig = shopConfig.thePhoneLabHeaderConfig;

  const [cartItemCount, setCartItemCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (estimationCart) {
      setCartItemCount(estimationCart.length);
    }
  }, [estimationCart]);
  
  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="w-full bg-white relative z-[1000] md:h-28">
      {/* Benefits Bar */}
      <div className="text-white py-2.5 overflow-hidden" style={{ backgroundColor: shopConfig.theme.primary }}>
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center space-y-1 md:space-y-0 px-4 md:px-0">
          <div className="flex items-center text-xs md:text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{getLocalizedText(headerConfig?.benefit1, currentLocale) || "Paid immediately"}</span>
          </div>
          <div className="flex items-center text-xs md:text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{getLocalizedText(headerConfig?.benefit2, currentLocale) || "Sales in 1 of our 12 stores"}</span>
          </div>
          <div className="flex items-center text-xs md:text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{getLocalizedText(headerConfig?.benefit3, currentLocale) || "No surprises"}</span>
          </div>
        </div>
      </div>

      {/* Main Header Area */}
      <div className="container mx-auto px-4 flex items-center justify-between h-20 relative">
        {/* Left Section: Cart & Language (visible on all screens) */}
        <div className="flex items-center space-x-4 z-20">
          <Link href="/cart" className="relative p-2">
            <CartIcon />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-xs font-semibold text-white">
                {cartItemCount}
              </span>
            )}
          </Link>
          <div>
            <LanguageSelector size="sm" variant="minimal" showChevron={false} />
          </div>
        </div>

        {/* Center Section: Reparaties, Logo & Winkels */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10">
          <div className="hidden md:block mr-8">
            <a href="https://thephonelab.nl/reparaties/" className="text-sm font-medium text-gray-800 hover:text-gray-900">
              {getLocalizedText(headerConfig?.repairs, currentLocale) || "Reparaties"}
            </a>
          </div>
          <div className="flex justify-center items-center h-[80px] md:h-[100px] w-[120px] md:w-[140px] mt-1 md:mt-5">
            <Link href="/" className="block">
              <Image
                src={logoUrl || '/placeholder-logo.png'}
                alt={shopName || 'THE PHONE LAB'}
                width={100} 
                height={60}
                style={{ objectFit: "contain" }}
                priority
              />
            </Link>
          </div>
          <div className="hidden md:block ml-8">
            <a href="https://thephonelab.nl/locaties/" className="text-sm font-medium text-gray-800 hover:text-gray-900">
              {getLocalizedText(headerConfig?.stores, currentLocale) || "Winkels"}
            </a>
          </div>
        </div>

        {/* Mobile Menu Button (visible only on mobile) */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 z-20"
          aria-label="Toggle menu"
        >
          <span className={`w-6 h-0.5 bg-gray-800 transition-all duration-300 ${mobileMenuOpen ? 'transform rotate-45 translate-y-1.5' : 'mb-1.5'}`}></span>
          <span className={`w-6 h-0.5 bg-gray-800 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : 'mb-1.5'}`}></span>
          <span className={`w-6 h-0.5 bg-gray-800 transition-all duration-300 ${mobileMenuOpen ? 'transform -rotate-45 -translate-y-1.5' : ''}`}></span>
        </button>

        {/* Right Section: Phone (visible only on desktop) */}
        <div className="hidden md:flex items-center z-20">
          <a
            href={`tel:${shopConfig.contactInfo?.phone || '0850486104'}`}
            className="flex items-center text-sm font-bold bg-yellow-400 px-3 py-2 rounded-md hover:bg-yellow-500 transition-colors"
          >
            <PhoneIcon />
            <span className="hidden sm:inline">{shopConfig.contactInfo?.phone || '085 048 6104'}</span>
          </a>
        </div>
        
        {/* Mobile Menu (full screen overlay) */}
        <div className={`fixed inset-0 bg-white z-50 flex flex-col transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} md:hidden`}>
          <div className="p-4 flex justify-between items-center border-b border-gray-100">
            <div className="w-10"></div> {/* Spacer */}
            <div className="w-[100px] h-[60px] relative">
              <Image
                src={logoUrl || '/placeholder-logo.png'}
                alt={shopName || 'THE PHONE LAB'}
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center text-gray-500"
              aria-label="Close menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 flex flex-col p-6 space-y-6">
            <nav className="flex flex-col space-y-4">
              <a 
                href="https://thephonelab.nl/reparaties/" 
                className="text-xl font-medium text-gray-800 hover:text-gray-900 border-b border-gray-100 pb-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {getLocalizedText(headerConfig?.repairs, currentLocale) || "Reparaties"}
              </a>
              <a 
                href="https://thephonelab.nl/locaties/" 
                className="text-xl font-medium text-gray-800 hover:text-gray-900 border-b border-gray-100 pb-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {getLocalizedText(headerConfig?.stores, currentLocale) || "Winkels"}
              </a>
            </nav>
            
            <div className="pt-6">
              <LanguageSelector size="sm" variant="minimal" showChevron={true} />
            </div>
            
            <div className="mt-auto pt-6">
              <a
                href={`tel:${shopConfig.contactInfo?.phone || '0850486104'}`}
                className="flex items-center justify-center text-base font-bold bg-yellow-400 px-4 py-3 rounded-md hover:bg-yellow-500 transition-colors w-full"
              >
                <PhoneIcon />
                {shopConfig.contactInfo?.phone || '085 048 6104'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 