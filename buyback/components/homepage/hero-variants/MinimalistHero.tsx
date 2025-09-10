import { AutocompleteSearch } from "../../shared/AutocompleteSearch";
import { HeroVariantProps } from "./index";
import Image from "next/image";
import { useHeroTranslationContent } from "@/hooks/catalog/useHeroTranslations";

export function MinimalistHero({ 
  heroSection, 
  primaryColor, 
  shopId,
  onSelectModel
}: HeroVariantProps) {
  // Get translated content using the translation hook
  const translatedContent = useHeroTranslationContent(heroSection);

  return (
    <section className="relative w-full overflow-hidden min-h-[85vh] bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
          {/* Content */}
          <div className="lg:col-span-6 space-y-6 md:space-y-8 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <div className="h-px w-8 md:w-12 bg-gray-300 dark:bg-gray-700"></div>
              <span className="text-xs md:text-sm text-gray-500 uppercase tracking-widest">{translatedContent.taglineBefore || "Sell Your Devices"}</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              {translatedContent.title}
            </h1>
            
            <h2 className="text-lg sm:text-xl text-gray-600 dark:text-gray-300">
              {translatedContent.subtitle}
            </h2>
            
            {translatedContent.description && (
              <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto lg:mx-0">
                {translatedContent.description}
              </p>
            )}
            
            {/* Device Search */}
            <div className="pt-2 md:pt-4 w-full max-w-xl mx-auto lg:mx-0">
              <AutocompleteSearch 
                shopId={shopId} 
                primaryColor={primaryColor} 
                onSelectModel={onSelectModel} 
                placeholder="Enter device name (e.g. iPhone 14)"
              />
              <p className="text-gray-400 text-xs md:text-sm mt-2 md:mt-3 ml-2 md:ml-4">
                Popular: iPhone 16, Samsung Galaxy S24, MacBook Pro...
              </p>
            </div>
            
            {/* Trust indicators */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 pt-6 md:pt-8 border-t border-gray-100 dark:border-gray-800 max-w-md mx-auto lg:max-w-none lg:mx-0">
              <div className="flex flex-col items-center lg:items-start">
                <span className="font-bold text-xl md:text-2xl text-gray-900 dark:text-white">24h</span>
                <span className="text-xs md:text-sm text-gray-500 text-center lg:text-left">Fast Payment</span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <span className="font-bold text-xl md:text-2xl text-gray-900 dark:text-white">95%</span>
                <span className="text-xs md:text-sm text-gray-500 text-center lg:text-left">Satisfied Users</span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <span className="font-bold text-xl md:text-2xl text-gray-900 dark:text-white">100%</span>
                <span className="text-xs md:text-sm text-gray-500 text-center lg:text-left">Secure Process</span>
              </div>
            </div>
          </div>
          
          {/* Image */}
          <div className="lg:col-span-6 relative order-first lg:order-last">
            <div className="relative aspect-square sm:aspect-[4/3] lg:aspect-[4/5] rounded-xl md:rounded-2xl overflow-hidden">
              <Image
                src={heroSection.backgroundImage}
                alt="Device"
                fill
                priority
                className="object-cover"
              />
              
              {/* Overlay with gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              
              {/* Price tags */}
              {heroSection.priceLabels && heroSection.priceLabels.length > 0 && (
                <>
                  {heroSection.priceLabels[0] && (
                    <div className="absolute top-3 md:top-6 left-3 md:left-6 bg-white/90 dark:bg-gray-800/90 rounded-lg px-3 md:px-4 py-2 backdrop-blur-sm shadow-lg">
                      <span className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">{heroSection.priceLabels[0].name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Up to</span>
                        <span className="text-xs md:text-sm font-bold" style={{ color: primaryColor }}>{heroSection.priceLabels[0].price}</span>
                      </div>
                    </div>
                  )}
                  {heroSection.priceLabels[1] && (
                    <div className="absolute bottom-3 md:bottom-6 right-3 md:right-6 bg-white/90 dark:bg-gray-800/90 rounded-lg px-3 md:px-4 py-2 backdrop-blur-sm shadow-lg">
                      <span className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">{heroSection.priceLabels[1].name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Up to</span>
                        <span className="text-xs md:text-sm font-bold" style={{ color: primaryColor }}>{heroSection.priceLabels[1].price}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Floating elements - hidden on small screens */}
            <div className="hidden md:block absolute -bottom-4 -left-4 lg:-left-12 w-16 md:w-24 h-16 md:h-24 rounded-xl bg-gray-100 dark:bg-gray-800 -z-10"></div>
            <div className="hidden md:block absolute -top-4 -right-4 lg:-right-12 w-24 md:w-32 h-24 md:h-32 rounded-xl border border-gray-200 dark:border-gray-700 -z-10"></div>
            
            {/* Accent element with primary color */}
            <div 
              className="hidden sm:block absolute -top-2 left-1/2 transform -translate-x-1/2 w-12 md:w-16 h-12 md:h-16 rounded-full -z-10"
              style={{ backgroundColor: `${primaryColor}20` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Abstract shapes - hidden on mobile */}
      <div className="hidden lg:block absolute top-0 right-0 w-1/3 h-1/3 opacity-5 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill={primaryColor} d="M34.2,-56.1C41.6,-45.7,43.5,-31.5,49.5,-18.4C55.5,-5.3,65.5,6.6,67.4,20.2C69.2,33.8,62.9,49.1,50.9,57.7C39,66.3,21.5,68.2,5.3,64.2C-11,60.2,-25.8,50.3,-36.8,38.8C-47.8,27.3,-54.9,14.2,-57.4,-0.5C-59.9,-15.2,-57.7,-31.3,-49.1,-42.9C-40.5,-54.5,-25.5,-61.6,-10.9,-61.8C3.7,-61.9,18.3,-56.1,29.3,-55.5C40.3,-54.9,46.7,-59.6,34.2,-56.1Z" transform="translate(100 100) scale(0.8)" />
        </svg>
      </div>
      
      <div className="hidden lg:block absolute bottom-0 left-0 w-1/4 h-1/4 opacity-5 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="#000000" d="M47.7,-73.2C60.9,-64.9,70.2,-49.8,75.5,-33.8C80.9,-17.9,82.3,-0.9,76.8,12.6C71.3,26.1,59,36.2,45.8,44.4C32.6,52.6,18.6,58.9,2.8,56.6C-13,54.4,-29.6,43.5,-42.1,31C-54.6,18.4,-63.1,4.1,-64.2,-11.8C-65.3,-27.7,-59,-45.3,-47,-59.1C-35,-72.9,-17.5,-83,1.3,-84.9C20.1,-86.9,40.2,-80.7,47.7,-73.2Z" transform="translate(100 100) scale(0.8)" />
        </svg>
      </div>
    </section>
  );
}
