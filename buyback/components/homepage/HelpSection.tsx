"use client";

import { useAtomValue } from "jotai";
import { currentLanguageObjectAtom } from "@/store/atoms";
import { ShopConfig } from "@/types/shop";
import { getLocalizedText } from "@/utils/localization";

interface HelpSectionProps {
  shopConfig: ShopConfig;
}

export function HelpSection({ shopConfig }: HelpSectionProps) {
  const currentLanguageObject = useAtomValue(currentLanguageObjectAtom);
  const currentLocale = currentLanguageObject?.code || 'en';
  const fallbackLocale = 'en';
  
  // Use helpConfig from shopConfig with fallbacks
  const helpConfig = shopConfig.helpConfig || {
    title: { en: "Need help?", nl: "Hulp nodig?", de: "Brauchen Sie Hilfe?", fr: "Besoin d'aide ?", es: "¿Necesitas ayuda?" },
    subtitle: { en: "Get in touch with one of our specialists", nl: "Neem contact op met een van onze specialisten", de: "Kontaktieren Sie einen unserer Spezialisten", fr: "Contactez l'un de nos spécialistes", es: "Ponte en contacto con uno de nuestros especialistas" },
    whatsapp: { en: "Whatsapp", nl: "Whatsapp", de: "Whatsapp", fr: "Whatsapp", es: "Whatsapp" },
    email: { en: "Email", nl: "Email", de: "Email", fr: "Email", es: "Email" },
    stores: { en: "13 stores", nl: "13 winkels", de: "13 Geschäfte", fr: "13 magasins", es: "13 tiendas" },
    comeVisit: { en: "Feel free to visit", nl: "Kom gerust langs", de: "Besuchen Sie uns gerne", fr: "N'hésitez pas à visiter", es: "No dudes en visitarnos" }
  };
  
  // Contact details - In a real app these would come from the shop config
  const contactDetails = {
    whatsapp: "0641422991",
    whatsappUrl: "https://api.whatsapp.com/send?phone=310641422991",
    email: "info@thephonelab.nl"
  };
  
  return (
    <div className="top-footer bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-end">
          <div className="w-full lg:w-1/3 hidden lg:block lg:pr-8">
            <img 
              src="https://verkopen.thephonelab.nl/assets/images/6-footer-top-image.png" 
              alt="The Phone Lab Specialist" 
              className="max-w-full h-auto rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null; 
                target.src = 'https://placehold.co/360x515/E2E8F0/4A5568?text=Specialist+Image';
              }}
            />
          </div>

          <div className="w-full lg:w-2/3 py-12">
            <div className="footer__text mb-8 md:mb-10 text-left">
              <h2 
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{ color: shopConfig.theme.primary }}
              >
                {getLocalizedText(helpConfig.title, currentLocale, fallbackLocale)}
              </h2>
              <p className="text-gray-700 text-lg">
                {getLocalizedText(helpConfig.subtitle, currentLocale, fallbackLocale)}
              </p>
            </div>

            <div className="flex flex-wrap -mx-2">
              <div className="w-full sm:w-1/2 md:w-1/3 px-2 mb-6 md:mb-0 text-left">
                <h3 className="font-bold text-xl text-gray-900 mb-2">
                  {getLocalizedText(helpConfig.whatsapp, currentLocale, fallbackLocale)}
                </h3>
                <p>
                  <a 
                    target="_blank" 
                    href={contactDetails.whatsappUrl} 
                    className="inline-flex items-center text-gray-700 no-underline"
                    style={{ 
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = shopConfig.theme.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#374151'; // text-gray-700
                    }}
                    rel="noopener noreferrer"
                  >
                    {contactDetails.whatsapp}
                  </a>
                </p>
              </div>

              {/* Email Block */}
              <div className="w-full sm:w-1/2 md:w-1/3 px-2 mb-6 md:mb-0 text-left">
                <h3 className="font-bold text-xl text-gray-900 mb-2">
                  {getLocalizedText(helpConfig.email, currentLocale, fallbackLocale)}
                </h3>
                <p>
                  <a 
                    href={`mailto:${contactDetails.email}`} 
                    className="text-gray-700 no-underline"
                    style={{ 
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = shopConfig.theme.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#374151'; // text-gray-700
                    }}
                  >
                    {contactDetails.email}
                  </a>
                </p>
              </div>

              {/* Stores Block */}
              <div className="w-full sm:w-1/2 md:w-1/3 px-2 mb-6 md:mb-0 text-left">
                <h3 className="font-bold text-xl text-gray-900 mb-2">
                  {getLocalizedText(helpConfig.stores, currentLocale, fallbackLocale)}
                </h3>
                <p className="text-gray-700">
                  {getLocalizedText(helpConfig.comeVisit, currentLocale, fallbackLocale)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
