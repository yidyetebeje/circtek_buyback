"use client";

import Image from "next/image";
import Link from "next/link";
import { ShopConfig } from "@/types/shop";
import { useState, useEffect } from "react";
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

interface DefaultHeaderProps {
  shopConfig: ShopConfig;
  estimationCart?: InProgressEstimation[];
}

export function DefaultHeader({ shopConfig, estimationCart }: DefaultHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // const [cartDropdownOpen, setCartDropdownOpen] = useState(false); // Reserved for future cart dropdown feature
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showNavbar = shopConfig.navigation?.showNavbar !== undefined ? 
    shopConfig.navigation.showNavbar : true;
  
  // const hasInProgressEstimations = estimationCart && estimationCart.length > 0;

  // Apply customizable colors
  const headerBg = shopConfig.headerStyle?.backgroundColor || '#ffffff';
  const headerText = shopConfig.headerStyle?.textColor || 'inherit';

  return (
    <header className="w-full">
      <BenefitsBar shopConfig={shopConfig} />
      
      <div
        className={`w-full transition-all duration-300 ${scrolled ? 'py-2 shadow-md' : 'py-4'}`}
        style={{ backgroundColor: headerBg, color: headerText }}
      >
        <div className="container mx-auto px-4 flex justify-between items-center relative">
          <Link href="/" className="flex items-center z-20">
            <Image 
              src={shopConfig.logoUrl} 
              alt={shopConfig.shopName} 
              width={scrolled ? 40 : 60} 
              height={20} 
              priority
              style={{ objectFit: "contain" }}
              className="transition-all duration-300"
            />
          </Link>
          
          {/* Mobile controls: Language selector first, hamburger after */}
          <div className="md:hidden z-20 flex items-center gap-2">
            {/* Language selector */}
            <LanguageSelector size="sm" variant="minimal" />

            {/* Cart icon */}
            <Link href="/cart" className="relative p-2" aria-label="Cart">
              <CartIcon />
              {estimationCart && estimationCart.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {estimationCart.length}
                </span>
              )}
            </Link>

            {/* Hamburger */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              aria-label="Toggle menu"
            >
              {!mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
          
          {showNavbar && (
            <div className="hidden md:flex items-center space-x-6">
              <NavigationBar shopConfig={shopConfig} showNav={true} />
            </div>
          )}
          
          <div className="hidden md:flex items-center gap-4 relative">
            <LanguageSelector size="sm" variant="minimal" />
            <Link href="/cart" className="relative p-2">
              <CartIcon />
              {estimationCart && estimationCart.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {estimationCart.length}
                </span>
              )}
            </Link>
          </div>
          
          <div
            className={`
              fixed inset-0 flex flex-col p-6 md:hidden transform transition-transform duration-300 ease-in-out
              ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
            `}
            style={{ backgroundColor: headerBg, color: headerText, zIndex: 100001 }}
          >
            <div className="flex justify-end">
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mt-10 space-y-4">
              {showNavbar && (
                <NavigationBar shopConfig={shopConfig} showNav={true} />
              )}
              <div className="flex items-center justify-between">
                <Link href="/cart" className="flex items-center text-sm font-medium hover:text-opacity-80 transition-colors gap-1.5">
                <CartIcon />
                <span>Cart {estimationCart && estimationCart.length > 0 && `(${estimationCart.length})`}</span>
              </Link>
                <LanguageSelector size="sm" variant="outlined" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
