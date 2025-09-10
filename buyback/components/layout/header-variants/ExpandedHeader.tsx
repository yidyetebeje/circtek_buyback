"use client";

import Image from "next/image";
import Link from "next/link";
import { ShopConfig } from "@/types/shop";
import { useState } from "react";
import { BenefitsBar } from "./common/BenefitsBar";
import { NavigationBar } from "./common/NavigationBar";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { InProgressEstimation } from "@/store/atoms";

// CartIcon component for shopping cart
const CartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

interface ExpandedHeaderProps {
  shopConfig: ShopConfig;
  estimationCart?: InProgressEstimation[];
}

export function ExpandedHeader({ shopConfig, estimationCart }: ExpandedHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showNavbar = shopConfig.navigation?.showNavbar !== undefined ? 
    shopConfig.navigation.showNavbar : true;

  const headerBg = shopConfig.headerStyle?.backgroundColor || '#ffffff';
  const headerText = shopConfig.headerStyle?.textColor || 'inherit';

  // Social media icons with hover effects
  const SocialIcon = ({ href, icon }: { href: string, icon: string }) => {
    const getIconPath = () => {
      switch (icon) {
        case 'facebook':
          return "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z";
        case 'twitter':
          return "M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z";
        case 'instagram':
          return "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z";
        default:
          return "";
      }
    };

    return (
      <a 
        href={href} 
        className="h-8 w-8 flex items-center justify-center rounded-full transition-transform hover:scale-110"
        style={{ backgroundColor: `${shopConfig.theme.secondary}40` }}
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d={getIconPath()} />
        </svg>
      </a>
    );
  };

  return (
    <header className="w-full flex flex-col">
      {/* Benefits Bar */}
      <BenefitsBar shopConfig={shopConfig} />

      {/* Top bar with contact info and social links */}
      <div 
        className="w-full py-3"
        style={{
          background: `linear-gradient(to right, ${shopConfig.theme.primary}, ${shopConfig.theme.secondary})`,
          color: '#ffffff'
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            {/* Contact info */}
            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <div className="flex items-center gap-2 text-xs">
                <div className="text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <span>{shopConfig.contactInfo?.phone || "+1 (555) 123-4567"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span>{shopConfig.contactInfo?.email || "support@devicebuyback.com"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>Mon-Fri: 9AM - 6PM</span>
              </div>
            </div>
            
            {/* Social media and language */}
            <div className="flex items-center gap-3">
              <SocialIcon 
                href={shopConfig.socialMedia?.facebook || "#"} 
                icon="facebook" 
              />
              <SocialIcon 
                href={shopConfig.socialMedia?.twitter || "#"} 
                icon="twitter" 
              />
              <SocialIcon 
                href={shopConfig.socialMedia?.instagram || "#"} 
                icon="instagram" 
              />
              
              <div className="h-4 w-0.5 bg-white/30 mx-1"></div>
              
              <LanguageSelector size="sm" variant="minimal" textColor="#ffffff" />
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="shadow-sm py-4" style={{ backgroundColor: headerBg, color: headerText }}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center relative z-10">
            <Image 
              src={shopConfig.logoUrl} 
              alt={shopConfig.shopName} 
              width={40} 
              height={20} 
              priority
              style={{ objectFit: "contain" }}
            />
          </Link>
          
          {/* Mobile controls: menu button, cart, language */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-100/80 transition-colors"
              aria-label="Toggle menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link href="/cart" className="relative p-2" aria-label="Cart">
              <CartIcon />
              {estimationCart && estimationCart.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {estimationCart.length}
                </span>
              )}
            </Link>

            <LanguageSelector size="sm" variant="minimal" />
          </div>
          
          {/* Desktop navigation and actions */}
          <div className="hidden md:flex items-center gap-6">
            {showNavbar && (
              <nav className="flex gap-1">
                <NavigationBar shopConfig={shopConfig} showNav={true}/>
              </nav>
            )}
            
            <div className="flex items-center gap-3">
              <Link href="/cart" className="relative p-2">
                <CartIcon />
                {estimationCart && estimationCart.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {estimationCart.length}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-md z-30">
          <div className="container mx-auto py-4 px-4 space-y-4">
            {showNavbar && (
              <nav className="flex flex-col space-y-2">
                <NavigationBar shopConfig={shopConfig} showNav={true}/>
              </nav>
            )}
            
            <div className="border-t pt-4">
              <Link href="/cart" className="flex items-center text-sm font-medium hover:text-opacity-80 transition-colors gap-1.5">
                <CartIcon />
                <span>Cart {estimationCart && estimationCart.length > 0 && `(${estimationCart.length})`}</span>
              </Link>
            </div>

            {/* Mobile contact info and social links - simplified */}
            <div className="border-t pt-4 space-y-2 text-sm">
              <p>{shopConfig.contactInfo?.phone || "+1 (555) 123-4567"}</p>
              <p>{shopConfig.contactInfo?.email || "support@devicebuyback.com"}</p>
              <div className="flex gap-3 pt-2">
                <SocialIcon href={shopConfig.socialMedia?.facebook || "#"} icon="facebook" />
                <SocialIcon href={shopConfig.socialMedia?.twitter || "#"} icon="twitter" />
                <SocialIcon href={shopConfig.socialMedia?.instagram || "#"} icon="instagram" />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <LanguageSelector size="md" variant="outlined" showName className="w-full justify-center" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
