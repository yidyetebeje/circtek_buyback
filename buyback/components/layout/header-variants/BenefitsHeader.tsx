"use client";

import Image from "next/image";
import Link from "next/link";
import { ShopConfig } from "@/types/shop";
import { useState } from "react";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { InProgressEstimation } from "@/store/atoms";

// CartIcon component for shopping cart
const CartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

interface BenefitsHeaderProps {
  shopConfig: ShopConfig;
  estimationCart?: InProgressEstimation[];
}

export function BenefitsHeader({ shopConfig, estimationCart }: BenefitsHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Default benefits data
  const defaultBenefits = [
    { id: "free-shipping", text: "Free shipping both ways", icon: "truck" },
    { id: "money-back", text: "Money back guarantee", icon: "shield-check" },
    { id: "instant-payments", text: "Instant payments", icon: "cash" },
    { id: "professional", text: "Professional service", icon: "star" }
  ];

  // Use customized benefits from shop config or fallback to defaults
  const benefitsConfig = shopConfig.benefits || {
    items: defaultBenefits,
    alignment: 'center',
    backgroundColor: shopConfig.theme.primary,
    textColor: '#ffffff',
    iconColor: '#ffffff',
    showBenefits: true
  };

  const headerBg = shopConfig.headerStyle?.backgroundColor || '#ffffff';
  const headerText = shopConfig.headerStyle?.textColor || 'inherit';

  // Get icon component based on name
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "truck":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      case "shield-check":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case "cash":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case "star":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        );
      case "check":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "clock":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "lightning":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
    }
  };
  
  // Get the alignment class based on config
  const getAlignmentClass = () => {
    switch (benefitsConfig.alignment) {
      case 'left': return 'justify-start';
      case 'center': return 'justify-center';
      case 'right': return 'justify-end';
      case 'space-between': return 'justify-between';
      case 'space-around': return 'justify-around';
      default: return 'justify-center';
    }
  };
  
  return (
    <div className="flex flex-col w-full">
      {/* Benefits bar */}
      {benefitsConfig.showBenefits && benefitsConfig.items.length > 0 && (
        <div 
          className="w-full py-2 border-b border-opacity-15 relative z-10"
          style={{ 
            backgroundColor: benefitsConfig.backgroundColor,
            color: benefitsConfig.textColor,
            borderColor: benefitsConfig.textColor + '20'
          }}
        >
          <div className="container mx-auto px-4">
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 ${getAlignmentClass()}`}>
              {benefitsConfig.items.map((benefit) => (
                <div key={benefit.id} className="flex items-center gap-2 justify-center md:justify-start">
                  <div className="bg-white bg-opacity-20 rounded-full p-1.5" style={{ color: benefitsConfig.iconColor }}>
                    {getIcon(benefit.icon)}
                  </div>
                  <span className="text-xs font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Main navigation */}
      <header className="shadow-sm" style={{ backgroundColor: headerBg, color: headerText }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 relative z-10">
            <Image 
              src={shopConfig.logoUrl} 
              alt={shopConfig.shopName} 
              width={40} 
              height={20} 
              priority
              style={{ objectFit: "contain" }}
            />
          </Link>
          
          {/* Mobile controls: menu button, cart icon, language selector */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-100/80 transition-colors"
              aria-label="Toggle menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Cart icon */}
            <Link href="/cart" className="relative p-2" aria-label="Cart">
              <CartIcon />
              {estimationCart && estimationCart.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {estimationCart.length}
                </span>
              )}
            </Link>

            {/* Language selector */}
            <LanguageSelector size="sm" variant="minimal" textColor={headerText} />
          </div>
          
          {/* Desktop navigation and actions */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex gap-2">
              {[
                { name: "Sell Device", href: "/sell-device", primary: true },
                { name: "Categories", href: "/category" },
                { name: "How It Works", href: "/how-it-works" },
                { name: "FAQ", href: "/faqs" },
                { name: "Contact", href: "/contact" }
              ].map((item) => (
                <Link 
                  key={item.name}
                  href={item.href}
                  className={`relative text-sm px-4 py-2 rounded-lg hover:bg-gray-100 transition-all
                    ${item.primary ? 'font-medium' : ''}`}
                  style={item.primary ? { color: shopConfig.theme.primary } : {}}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            
            <div className="flex items-center gap-3">
              <Link 
                href="/cart" 
                className="relative p-2 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-all flex items-center gap-1.5"
              >
                <span className="h-5 w-5">
                  <CartIcon />
                </span>
                <span>Cart</span>
                {estimationCart && estimationCart.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {estimationCart.length}
                  </span>
                )}
              </Link>
              
              {/* Get Quote button removed */}
              
              <LanguageSelector size="sm" variant="minimal" textColor={shopConfig.theme.text} />
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile menu */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300
          ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div 
          className={`absolute inset-y-0 right-0 w-3/4 max-w-sm bg-white shadow-lg transition-transform duration-300
            ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full p-5">
            <div className="flex justify-end mb-6">
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <nav className="flex flex-col space-y-4 mb-8">
              {[
                { name: "Sell Device", href: "/sell-device", primary: true },
                { name: "Categories", href: "/category" },
                { name: "How It Works", href: "/how-it-works" },
                { name: "FAQ", href: "/faqs" },
                { name: "Contact", href: "/contact" },
                { name: "Track Order", href: "/track-order" }
              ].map((item) => (
                <Link 
                  key={item.name}
                  href={item.href}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-100"
                  style={item.primary ? { color: shopConfig.theme.primary } : {}}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className={item.primary ? 'font-medium' : ''}>{item.name}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </nav>
            
            <div className="mt-auto">
                {/* Get Quote button removed */}
              
              <div className="flex justify-center mt-6">
                <LanguageSelector size="md" variant="minimal" showName />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
