"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShopConfig } from "@/types/shop";

interface NavigationBarProps {
  shopConfig: ShopConfig;
  showNav: boolean; // Toggle to control visibility
}

export function NavigationBar({ shopConfig, showNav }: NavigationBarProps) {
  const [isHomePage, setIsHomePage] = useState(false);

  // Check if we're on the home page
  useEffect(() => {
    setIsHomePage(window.location.pathname === '/' || window.location.pathname === '/home');
  }, []);

  if (!showNav) {
    return null;
  }

  // For home page, use smooth scrolling to sections
  const handleSectionScroll = (sectionId: string, e: React.MouseEvent) => {
    if (isHomePage) {
      e.preventDefault();
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  };

  return (
    <nav className="flex space-x-6">
      {/* Categories are always shown as per ConfigSidebar */}
      <Link
        href="/#categories"
        className="text-sm font-medium hover:text-opacity-70 transition-colors"
        onClick={(e) => handleSectionScroll('categories', e)}
      >
        Categories
      </Link>
      
      {/* Only show Featured Products if enabled */}
      {shopConfig.showFeaturedProducts && (
        <Link
          href="/#featuredProducts"
          className="text-sm font-medium hover:text-opacity-70 transition-colors"
          onClick={(e) => handleSectionScroll('featuredProducts', e)}
        >
          Featured
        </Link>
      )}
      
      {/* Only show Testimonials if enabled */}
      {shopConfig.showTestimonials && (
        <Link
          href="/#testimonials"
          className="text-sm font-medium hover:text-opacity-70 transition-colors"
          onClick={(e) => handleSectionScroll('testimonials', e)}
        >
          Testimonials
        </Link>
      )}
      
      {/* Only show Partners if enabled */}
      {shopConfig.showPartners && (
        <Link
          href="/#partners"
          className="text-sm font-medium hover:text-opacity-70 transition-colors"
          onClick={(e) => handleSectionScroll('partners', e)}
        >
          Partners
        </Link>
      )}
      
      {/* FAQ link directs to dedicated FAQs page */}
      {shopConfig.faq?.showFAQ && (
        <Link
          href="/faqs"
          className="text-sm font-medium hover:text-opacity-70 transition-colors"
        >
          FAQ
        </Link>
      )}
    </nav>
  );
}
