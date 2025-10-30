"use client";

import { useAtomValue } from "jotai";
import { currentLanguageObjectAtom } from "@/store/atoms";
import { getLocalizedText } from "@/utils/localization";

export function GlobalEarthSection() {
  const currentLanguageObject = useAtomValue(currentLanguageObjectAtom);
  const currentLocale = currentLanguageObject?.code || 'en';
  const fallbackLocale = 'en';
  
  const translations = {
    heading: { 
      en: "Reduce e-waste, make money with your old device", 
      nl: "Verminder e-waste, verdien geld met je oude apparaat" 
    },
    subheading: {
      en: "Receive your personalized offer with a few clicks",
      nl: "Ontvang je persoonlijke aanbieding met een paar klikken"
    }
  };
  
  return (
    <section className="global-earth-section py-10 sm:py-12 md:py-16 lg:py-20 bg-[#fcfaf8]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          
          {/* Globe Icon */}
          <div className="mb-6 sm:mb-8">
            <img 
              src="https://verkopen.thephonelab.nl/assets/images/domain-6-globe-icon.png?v=1" 
              alt="Globe Icon" 
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
          <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-3 sm:mb-4 md:mb-5 leading-tight px-4 max-w-4xl">
            {getLocalizedText(translations.heading, currentLocale, fallbackLocale)}
          </h3>
          
          {/* Sub-paragraph */}
          <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed max-w-2xl px-4">
            {getLocalizedText(translations.subheading, currentLocale, fallbackLocale)}
          </p>

        </div>
      </div>
    </section>
  );
}
