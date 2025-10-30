"use client";

import Image from "next/image";
import Link from "next/link";
import { ShopConfig } from "@/types/shop";
import { useState, useEffect } from "react";
import { NavigationBar } from "./common/NavigationBar";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { InProgressEstimation } from "@/store/atoms";

interface RemarketedBuybackHeaderProps {
  shopConfig: ShopConfig;
  estimationCart?: InProgressEstimation[];
}

// CheckIcon component for benefits
const CheckIcon = ({ color }: { color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: color || 'currentColor' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// CartIcon component for shopping cart
const CartIcon = ({ color }: { color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: color || 'currentColor' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

export function RemarketedBuybackHeader({ shopConfig, estimationCart }: RemarketedBuybackHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Ensure client-side rendering for proper hydration
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Get navigation visibility from config or default to true
  const showNavbar = shopConfig.navigation?.showNavbar !== undefined ? 
    shopConfig.navigation.showNavbar : true;

  // Get colors from config or use defaults
  const headerBg = shopConfig.headerStyle?.backgroundColor || '#1e4d5b';
  const headerText = shopConfig.headerStyle?.textColor || 'white';
  const mobileMenuBg = shopConfig.headerStyle?.backgroundColor || '#ffffff';

  // Benefits to display (can be made configurable in shopConfig)
  const benefits = [
    "Makkelijk aanmelden",
    "Gratis opsturen", 
    "Snel geld verdienen"
  ];
  
  return (
    <header className="w-full">
      {/* Main header bar */}
      <div 
        className="w-full py-5 sticky top-0 z-40"
        style={{ 
          backgroundColor: isClient ? headerBg : '#1e4d5b',
          color: isClient ? headerText : 'white',
        }}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Logo on the left */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image 
                src={shopConfig.logoUrl} 
                alt={shopConfig.shopName} 
                width={200} 
                height={55} 
                priority
                style={{ objectFit: "contain" }}
              />
            </Link>
          </div>
          
          {/* Benefits in the center - hidden on mobile */}
          <div className="hidden md:flex items-center justify-center space-x-10 flex-1">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3" style={{ color: isClient ? headerText : 'white' }}>
                <CheckIcon color="#22c55e" />
                <span className="text-base font-medium">{benefit}</span>
              </div>
            ))}
          </div>
          
          {/* Cart and actions on the right */}
          <div className="flex items-center space-x-4">
            <Link href="/cart" className="relative p-3" aria-label="Cart" style={{ color: isClient ? headerText : 'white' }}>
              <CartIcon color={isClient ? headerText : 'white'} />
              {estimationCart && estimationCart.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  {estimationCart.length}
                </span>
              )}
            </Link>
            
            <div className="hidden md:block">
              <LanguageSelector size="sm" variant="minimal" />
            </div>
            
            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="md:hidden p-3"
              style={{ color: isClient ? headerText : 'white' }}
            >
              {!mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: isClient ? headerText : 'white' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: isClient ? headerText : 'white' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation bar below if enabled */}
      {showNavbar && (
        <div className="hidden md:block w-full bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-3">
            <NavigationBar shopConfig={shopConfig} showNav={true} />
          </div>
        </div>
      )}
      
      {/* Mobile menu overlay */}
      <div className={`md:hidden fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full" style={{ backgroundColor: mobileMenuBg }}>
          {/* Mobile menu header */}
          <div className="flex justify-between items-center p-5 border-b" style={{ backgroundColor: isClient ? headerBg : '#1e4d5b', color: isClient ? headerText : 'white' }}>
            <Image 
              src={shopConfig.logoUrl} 
              alt={shopConfig.shopName} 
              width={160} 
              height={42} 
              priority
              style={{ objectFit: "contain" }}
            />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-3"
              style={{ color: isClient ? headerText : 'white' }}
              aria-label="Close menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Mobile benefits */}
          <div className="p-5 border-b bg-gray-50">
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckIcon color="#22c55e" />
                  <span className="text-base font-medium text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Mobile navigation */}
          {showNavbar && (
            <div className="p-5 space-y-4">
              <NavigationBar shopConfig={shopConfig} showNav={true} />
            </div>
          )}
          
          {/* Mobile utilities */}
          <div className="mt-auto p-5 border-t">
            <div className="flex items-center justify-between">
              <Link
                href="/cart"
                className="flex items-center text-base font-medium hover:text-opacity-80 transition-colors gap-3"
                onClick={() => setMobileMenuOpen(false)}
              >
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