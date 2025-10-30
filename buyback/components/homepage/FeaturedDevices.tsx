import Image from "next/image";
import Link from "next/link";
import { ShopConfig } from "@/types/shop";
import { useFeaturedDevices } from "@/hooks/catalog/useFeaturedDevices";
import { useState, useEffect } from "react";
import { useTranslations, useLocale } from 'next-intl';
import { useAtomValue } from "jotai";
import { currentLanguageObjectAtom, availableLanguagesAtom } from "@/store/atoms";
import { getLocalizedText } from "@/utils/localization";

interface FeaturedDevicesProps {
  shopConfig: ShopConfig;
  shopId?: number; // Optional shop ID to filter featured devices
}

export function FeaturedDevices({ shopConfig, shopId }: FeaturedDevicesProps) {
  // Get translations from next-intl
  const t = useTranslations('FeaturedDevicesSection');
  const nextIntlLocale = useLocale();
  
  // Get language state from jotai atoms
  const currentLanguageObject = useAtomValue(currentLanguageObjectAtom);
  const availableLanguages = useAtomValue(availableLanguagesAtom);
  
  // Set up language preferences
  const currentLocale = currentLanguageObject?.code || 'en';
  const fallbackLocale = availableLanguages.find(lang => lang.isDefault)?.code || 'en';
  
  // For debugging
 
  
  // Fetch featured devices with filters
  const { data: featuredDevicesResponse, isLoading, isError } = useFeaturedDevices({ 
    isPublished: true,
    limit: 4,
    ...(shopId ? { shopId } : {}),
    // Add language parameter to fetch data in current language
    languageCode: currentLocale
  });
  
  // Get the featured devices array
  const featuredDevices = featuredDevicesResponse?.data || [];
  
  // Don't render the section if there are no featured devices
  if (!isLoading && (isError || featuredDevices.length === 0)) {
    return null;
  }
  
  return (
    <section className="py-20 relative overflow-hidden" key={`featured-devices-${currentLocale}`}>
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-sm -z-10"></div>
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-[color:var(--color-primary)]/5 to-transparent -z-10"></div>
      
      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col items-center mb-16">
          <div className="inline-flex items-center justify-center mb-4">
            <span className="h-[1px] w-10 bg-gray-300"></span>
            <span 
              className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-center mx-3 rounded-full"
              style={{ 
                color: shopConfig.theme.primary,
                backgroundColor: `${shopConfig.theme.primary}10` 
              }}
            >
              {t('featuredBadge')}
            </span>
            <span className="h-[1px] w-10 bg-gray-300"></span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            {t('title')}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-center text-lg">
            {t('subtitle')}
          </p>
        </div>
        
        {/* Featured devices showcase */}
        <div className="flex flex-wrap justify-center gap-8">
          {isLoading ? (
            // Loading skeletons
            Array(3).fill(0).map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-white/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-md animate-pulse">
                <div className="h-64 w-full bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            featuredDevices.map((device, index) => {
              // Determine if this is the first device (to show the "Best Value" badge)
              const isBestValue = index === 0;
              
              // Get device details
              const model = device.model;
              // Use getLocalizedText for title if it's a translatable object, otherwise use t()
              const modelTitle = model?.title ? 
                (typeof model.title === 'object' ? 
                  getLocalizedText(model.title, currentLocale, fallbackLocale) : 
                  model.title) : 
                t('defaultModelTitle');
              const modelImage = model?.model_image || "https://placehold.co/600x800?text=No+Image";
              const basePrice = model?.base_price || 0;
              const deviceIdentifier = model?.sef_url || modelTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              const estimateUrl = `/${currentLocale}/sell/${deviceIdentifier}/estimate`;
              
              return (
                <Link 
                  href={estimateUrl}
                  key={device.id}
                  className="block bg-white/60 backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-300 hover:translate-y-[-8px] hover:shadow-xl shadow-md group relative"
                  style={{
                    boxShadow: '0 10px 40px -15px rgba(0,0,0,0.1)',
                  }}
                >
                  {isBestValue && (
                    <div className="absolute top-4 right-4 z-30">
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                        <svg className="mr-1.5 h-2 w-2 fill-yellow-500" viewBox="0 0 8 8">
                          <circle cx="4" cy="4" r="3" />
                        </svg>
                        {t('bestValueBadge')}
                      </span>
                    </div>
                  )}
                  <div className="relative h-64 w-full overflow-hidden">
                    <Image
                      src={modelImage}
                      alt={modelTitle}
                      fill
                      className="object-contain group-hover:scale-110 transition-transform duration-700 ease-in-out"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-xl group-hover:text-[color:var(--color-primary)] transition-colors duration-300">
                        {modelTitle}
                      </h3>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">
                      {t('tradeInValueFor', { modelTitle })}
                    </p>
                    
                    <div className="border-t border-gray-100 pt-4 mt-auto">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-500 text-xs">{t('tradeInValueUpTo')}</span>
                          <p className="text-2xl font-bold" style={{ color: shopConfig.theme.primary }}>
                            ${basePrice.toFixed(2)}
                          </p>
                        </div>
                        <div 
                          className="inline-flex items-center justify-center rounded-full w-10 h-10"
                          style={{ backgroundColor: `${shopConfig.theme.primary}15` }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: shopConfig.theme.primary }}>
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
} 