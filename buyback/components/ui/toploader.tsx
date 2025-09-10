'use client';

import NextTopLoader from 'nextjs-toploader';
import { useAtomValue } from 'jotai';
import { shopConfigAtom } from '@/store/atoms';
import { useEffect, useState } from 'react';

/**
 * TopLoader Component
 * 
 * Displays a progress bar at the top of the page during route transitions.
 * The color automatically adapts to the shop's primary theme color.
 * 
 * Features:
 * - Uses the shop's primary color from the configuration
 * - Includes loading spinner
 * - Smooth animations and transitions
 * - Optimized for performance with proper hydration handling
 * 
 * Configuration:
 * - height: 3px progress bar
 * - speed: 200ms animation speed
 * - crawlSpeed: 200ms crawl animation
 * - shadow: Dynamic shadow matching the primary color
 * - zIndex: 1600 to ensure it appears above other content
 */
export function TopLoader() {
  const shopConfig = useAtomValue(shopConfigAtom);
  const [mounted, setMounted] = useState(false);
  
  // Ensure component is mounted before rendering to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }
  
  const primaryColor = shopConfig?.theme?.primary || '#3b82f6';
  
  return (
    <NextTopLoader
      color={primaryColor}
      initialPosition={0.08}
      crawlSpeed={200}
      height={3}
      crawl={true}
      showSpinner={true}
      easing="ease"
      speed={200}
      shadow={`0 0 10px ${primaryColor},0 0 5px ${primaryColor}`}
      template='<div class="bar" role="bar"><div class="peg"></div></div> 
      <div class="spinner" role="spinner"><div class="spinner-icon"></div></div>'
      zIndex={1600}
      showAtBottom={false}
    />
  );
} 