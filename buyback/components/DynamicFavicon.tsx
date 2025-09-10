'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useShopConfig } from '@/hooks/useShopConfig';

export default function DynamicFavicon() {
  const shopConfig = useShopConfig();
  const [isClient, setIsClient] = useState(false);
  
  // Ensure this only runs on the client side after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    return null;
  }

  // Priority order: environment variable, shopConfig.faviconUrl, shopConfig.logoUrl, default
  const faviconUrl = process.env.NEXT_PUBLIC_FAVICON_URL || 
                     shopConfig?.faviconUrl || 
                     shopConfig?.logoUrl || 
                     '/favicon.ico';

  return (
    <Head>
      <link rel="icon" href={faviconUrl} type="image/png" />
      <link rel="apple-touch-icon" href={faviconUrl} />
    </Head>
  );
}
