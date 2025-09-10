"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShopConfig } from "@/types/shop";
import { InProgressEstimation } from "@/store/atoms";
import { BenefitsBar } from "./common/BenefitsBar";
import { NavigationBar } from "./common/NavigationBar";
import { LanguageSelector } from "@/components/shared/LanguageSelector";

/**
 * ModernHeader – A clean, minimal header variant that adapts its background on scroll
 * and provides a mobile-friendly slide-in menu. The cart icon badge is now properly
 * aligned across breakpoints (matching other header variants).
 */
interface ModernHeaderProps {
  shopConfig: ShopConfig;
  estimationCart?: InProgressEstimation[];
}

export function ModernHeader({ shopConfig, estimationCart }: ModernHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  const showNavbar: boolean = shopConfig.navigation?.showNavbar ?? true;
  const headerBg: string = shopConfig.headerStyle?.backgroundColor ?? (scrolled ? "#ffffff" : "transparent");
  const headerText: string = shopConfig.headerStyle?.textColor ?? "inherit";

  // Use an opaque background for the mobile menu so its contents are always visible
  const mobileMenuBg: string = shopConfig.headerStyle?.backgroundColor ?? "#ffffff";

  // Update `scrolled` state when the user scrolls the page.
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * Renders the cart icon with an optional badge showing the number of items
   * currently in the estimation cart.
   */
  const Cart = () => (
    <Link href="/cart" className="relative inline-flex items-center justify-center p-2" aria-label="Cart">
      {/* Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 md:h-6 md:w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4m-8 2a2 2 0 11-4 0 2 2 0 014 0"
        />
      </svg>

      {/* Badge */}
      {estimationCart?.length ? (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold leading-none text-white">
          {estimationCart.length}
        </span>
      ) : null}
    </Link>
  );

  return (
    <header
      className="inset-x-0 top-0 z-40 flex flex-col backdrop-blur-md transition-shadow duration-300"
      style={{
        backgroundColor: headerBg,
        color: headerText,
        boxShadow: scrolled ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
      }}
    >
      {/* Benefit bar */}
      <BenefitsBar shopConfig={shopConfig} />

      {/* Toolbar */}
      <div className={`w-full transition-all ${scrolled ? "py-2" : "py-4"}`}>
        <div className="container mx-auto flex items-center justify-between px-4">
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

          {/* Desktop navigation */}
          {showNavbar && (
            <div className="hidden md:flex flex-1 justify-center">
              <NavigationBar shopConfig={shopConfig} showNav />
            </div>
          )}

          {/* Desktop utilities */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSelector size="sm" variant="minimal" />
            <Cart />
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            <Cart />
            <LanguageSelector size="sm" variant="minimal" />
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              {!mobileMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile slide-in menu */}
      <div
        className={`
          fixed inset-0 flex flex-col p-6 md:hidden transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}
        `}
        style={{ backgroundColor: mobileMenuBg, color: headerText, zIndex: 100001 }}
      >
        {/* Close button */}
        <div className="flex justify-end">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Close menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation & utilities */}
        <div className="mt-10 space-y-4">
          {showNavbar && (
            <NavigationBar shopConfig={shopConfig} showNav />
          )}

          <div className="flex items-center justify-between">
            <Link
              href="/cart"
              className="flex items-center text-sm font-medium hover:text-opacity-80 transition-colors gap-1.5"
            >
              {/* Re-use the same Cart icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4m-8 2a2 2 0 11-4 0 2 2 0 014 0"
                />
              </svg>
              <span>
                Cart {estimationCart && estimationCart.length > 0 && `(${estimationCart.length})`}
              </span>
            </Link>
            <LanguageSelector size="sm" variant="outlined" />
          </div>
        </div>
      </div>
    </header>
  );
}
