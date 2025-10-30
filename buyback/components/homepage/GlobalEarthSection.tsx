"use client";

import { useAtomValue } from "jotai";
import { currentLanguageObjectAtom } from "@/store/atoms";
import { getLocalizedText } from "@/utils/localization";
import { ShopConfig } from "@/types/shop";

interface GlobalEarthSectionProps {
  shopConfig: ShopConfig;
}

export function GlobalEarthSection({ shopConfig }: GlobalEarthSectionProps) {
  const currentLanguageObject = useAtomValue(currentLanguageObjectAtom);
  const currentLocale = currentLanguageObject?.code || 'en';
  const fallbackLocale = 'en';
  
  // Use globalEarthConfig from shopConfig with fallbacks
  const globalEarthConfig = shopConfig.globalEarthConfig || {
    heading: { 
      en: "Reduce e-waste, make money with your old device", 
      nl: "Verminder e-waste, verdien geld met je oude apparaat" 
    },
    subheading: {
      en: "Receive your personalized offer with a few clicks",
      nl: "Ontvang je persoonlijke aanbieding met een paar klikken"
    },
    imageUrl: "https://verkopen.thephonelab.nl/assets/images/domain-6-globe-icon.png?v=1",
    imageAlt: { en: "Globe Icon", nl: "Globe Icoon" }
  };
  
  // Get styling configuration with fallbacks
  const sectionStyle = {
    backgroundColor: globalEarthConfig.backgroundColor || '#fcfaf8',
    color: globalEarthConfig.textColor || 'inherit'
  };
  
  // Dynamic classes based on whether custom colors are used
  const headingColorClass = globalEarthConfig.textColor ? '' : 'text-gray-800';
  const subheadingColorClass = globalEarthConfig.textColor ? '' : 'text-gray-600';
  
  return (
    <section 
      className="global-earth-section py-10 sm:py-12 md:py-16 lg:py-20"
      style={sectionStyle}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          
          {/* Globe Icon */}
          <div className="mb-6 sm:mb-8">
            <img 
              src={globalEarthConfig.imageUrl || "https://verkopen.thephonelab.nl/assets/images/domain-6-globe-icon.png?v=1"} 
              alt={getLocalizedText(globalEarthConfig.imageAlt || { en: "Globe Icon" }, currentLocale, fallbackLocale)} 
              className="max-w-full h-auto w-32 sm:w-40 md:w-48 lg:w-60 xl:w-64"
              style={{ maxHeight: '250px' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = 'https://placehold.co/250x250/E2E8F0/4A5568?text=Globe+Image';
              }}
            />
          </div>
          
          {/* Heading */}
          <h3 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 md:mb-5 leading-tight px-4 max-w-4xl ${headingColorClass}`}>
            {getLocalizedText(globalEarthConfig.heading, currentLocale, fallbackLocale)}
          </h3>
          
          {/* Sub-paragraph */}
          <p className={`text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl px-4 ${subheadingColorClass}`}>
            {getLocalizedText(globalEarthConfig.subheading, currentLocale, fallbackLocale)}
          </p>

        </div>
      </div>
    </section>
  );
}
