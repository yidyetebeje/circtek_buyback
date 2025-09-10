"use client";

import Image from "next/image";
import Link from "next/link";
import { ShopConfig } from "@/types/shop";
import { useState } from "react";
import { BenefitsBar } from "./common/BenefitsBar";
import { NavigationBar } from "./common/NavigationBar";
// CartIcon component for shopping cart
const CartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { InProgressEstimation } from "@/store/atoms";

interface CompactHeaderProps {
  shopConfig: ShopConfig;
  estimationCart?: InProgressEstimation[];
}

export function CompactHeader({ shopConfig, estimationCart }: CompactHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get navigation visibility from config or default to true
  const showNavbar = shopConfig.navigation?.showNavbar !== undefined ? 
    shopConfig.navigation.showNavbar : true;
  
  const headerBg = shopConfig.headerStyle?.backgroundColor || `${shopConfig.theme.background}95`;
  const headerText = shopConfig.headerStyle?.textColor;
  
  return (
    <header className="w-full">
      {/* Include Benefits Bar Component */}
      <BenefitsBar shopConfig={shopConfig} />
      
      <div 
        className="w-full py-2 border-b backdrop-blur-md sticky top-0 z-40"
        style={{ 
          backgroundColor: headerBg, 
          borderColor: 'rgba(0,0,0,0.06)',
          color: headerText,
        }}
      >
        <div className="container mx-auto px-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image 
                src={shopConfig.logoUrl} 
                alt={shopConfig.shopName} 
                width={40} 
                height={20} 
                priority
                style={{ objectFit: "contain" }}
              />
            </Link>
          </div>
          
          {/* Desktop navigation */}
          {showNavbar && (
            <div className="hidden md:flex items-center justify-center space-x-3 mx-4 flex-1">
              <NavigationBar shopConfig={shopConfig} showNav={true} />
            </div>
          )}
          
          {/* Action buttons */}
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/cart" className="relative p-2">
              <CartIcon />
              {estimationCart && estimationCart.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {estimationCart.length}
                </span>
              )}
            </Link>
            <LanguageSelector size="sm" variant="minimal" />
          </div>
          
          {/* Mobile controls: menu button, cart icon, language selector */}
          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="p-2"
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
        </div>
        
        {/* Mobile menu */}
        <div className={`md:hidden absolute top-full left-0 w-full bg-white shadow-md transition-transform duration-300 transform ${mobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="container mx-auto py-4 px-3 space-y-3">
            {showNavbar && (
              <div className="space-y-2">
                <NavigationBar shopConfig={shopConfig} showNav={true} />
              </div>
            )}
            
            <div className="border-t pt-3 flex justify-between">
              <Link href="/cart" className="flex items-center text-sm font-medium hover:text-opacity-80 transition-colors gap-1.5">
                <CartIcon />
                <span>Cart {estimationCart && estimationCart.length > 0 && `(${estimationCart.length})`}</span>
              </Link>
              <LanguageSelector size="sm" variant="outlined" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
