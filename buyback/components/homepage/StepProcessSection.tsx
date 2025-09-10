"use client";

import { useAtomValue } from "jotai";
import { currentLanguageObjectAtom } from "@/store/atoms";
import { getLocalizedText } from "@/utils/localization";
import { ShopConfig } from "@/types/shop";

interface StepProcessSectionProps {
  shopConfig: ShopConfig;
}

export function StepProcessSection({ shopConfig }: StepProcessSectionProps) {
  const currentLanguageObject = useAtomValue(currentLanguageObjectAtom);
  const currentLocale = currentLanguageObject?.code || 'en';
  const fallbackLocale = 'en';
  
  // Use stepProcessConfig from shopConfig with fallbacks
  const stepProcessConfig = shopConfig.stepProcessConfig || {
    step1Title: { en: "Sign up", nl: "Inschrijven" },
    step1Description: { en: "Answer a few questions and receive your price proposal", nl: "Beantwoord enkele vragen en ontvang je prijsvoorstel" },
    step2Title: { en: "Return", nl: "Retourneren" },
    step2Description: { en: "Return your device to one of our 13 stores or send it to us free of charge", nl: "Lever je apparaat in bij een van onze 13 winkels of stuur het gratis naar ons op" },
    step3Title: { en: "Earn money", nl: "Verdien geld" },
    step3Description: { en: "Paid directly in our stores, with no surprises. When sent within 24 hours", nl: "Direct uitbetaald in onze winkels, zonder verrassingen. Bij verzending binnen 24 uur" }
  };
  
  return (
    <div className="step-process-section py-12 sm:py-16 md:py-20 bg-[#fcfaf8]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between text-center space-y-8 md:space-y-0 md:space-x-6 lg:space-x-8">
          
          {/* Step 1 */}
          <div className="flex-1 max-w-sm mx-auto md:max-w-none">
            <div 
              className="text-6xl sm:text-7xl md:text-[4.5rem] leading-none font-bold mb-4 md:mb-6"
              style={{ color: shopConfig.theme.primary }}
            >
              1
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 md:mb-3">
              {getLocalizedText(stepProcessConfig.step1Title, currentLocale, fallbackLocale)}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xs mx-auto">
              {getLocalizedText(stepProcessConfig.step1Description, currentLocale, fallbackLocale)}
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex-1 max-w-sm mx-auto md:max-w-none">
            <div 
              className="text-6xl sm:text-7xl md:text-[4.5rem] leading-none font-bold mb-4 md:mb-6"
              style={{ color: shopConfig.theme.primary }}
            >
              2
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 md:mb-3">
              {getLocalizedText(stepProcessConfig.step2Title, currentLocale, fallbackLocale)}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xs mx-auto">
              {getLocalizedText(stepProcessConfig.step2Description, currentLocale, fallbackLocale)}
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex-1 max-w-sm mx-auto md:max-w-none">
            <div 
              className="text-6xl sm:text-7xl md:text-[4.5rem] leading-none font-bold mb-4 md:mb-6"
              style={{ color: shopConfig.theme.primary }}
            >
              3
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 md:mb-3">
              {getLocalizedText(stepProcessConfig.step3Title, currentLocale, fallbackLocale)}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xs mx-auto">
              {getLocalizedText(stepProcessConfig.step3Description, currentLocale, fallbackLocale)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
