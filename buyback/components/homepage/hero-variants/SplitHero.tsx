import Image from "next/image";
import { AutocompleteSearch } from "../../shared/AutocompleteSearch";
import { HeroVariantProps } from "./index";
import { useHeroTranslationContent } from "@/hooks/catalog/useHeroTranslations";

export function SplitHero({ 
  heroSection, 
  primaryColor, 
  shopId,
  onSelectModel
}: HeroVariantProps) {
  // Get translated content using the translation hook
  const translatedContent = useHeroTranslationContent(heroSection);

  return (
    <section className="relative w-full overflow-hidden min-h-[85vh]">
      <div className="flex flex-col md:flex-row h-full min-h-[85vh]">
        {/* Left content */}
        <div className="w-full md:w-1/2 flex items-center bg-gradient-to-br from-gray-900 to-gray-800 p-6 md:p-16">
          <div className="max-w-xl mx-auto md:mx-0 flex flex-col space-y-6">
            <div 
              className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm text-white/80 font-medium inline-flex items-center space-x-2 w-fit"
              style={{ borderLeft: `3px solid ${primaryColor}` }}
            >
              <span className="pl-2">{translatedContent.tagline || "Fast & Secure Buyback"}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {translatedContent.title}
            </h1>
            
            <h2 className="text-xl font-medium text-white/90">
              {translatedContent.subtitle}
            </h2>
            
            {translatedContent.description && (
              <p className="text-base text-white/80 max-w-lg">
                {translatedContent.description}
              </p>
            )}
            
            <div className="pt-4 w-full">
              <AutocompleteSearch 
                shopId={shopId} 
                primaryColor={primaryColor} 
                onSelectModel={onSelectModel} 
                placeholder="Find your device (e.g. Pixel 8)"
              />
              <p className="text-white/60 text-sm mt-3 ml-4">
                Popular: iPhone 16, Samsung Galaxy S24, MacBook Pro...
              </p>
            </div>
            
            {/* Trust indicators */}
            <div className="flex items-center gap-x-8 mt-6 pt-6 border-t border-white/10">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-white">24h</span>
                <span className="text-xs text-white/70">Fast Payment</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-white">4.9★</span>
                <span className="text-xs text-white/70">User Rating</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-white">100%</span>
                <span className="text-xs text-white/70">Secure Process</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right image */}
        <div className="w-full md:w-1/2 relative min-h-[50vh] md:min-h-full">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-gray-900/40 z-10 md:hidden" />
          <Image
            src={heroSection.backgroundImage}
            alt={translatedContent.title || "Device Showcase"}
            fill
            priority
            className="object-cover"
          />
          
          {heroSection.featuredDevices && heroSection.featuredDevices.length > 0 && (
            <>
             {heroSection.featuredDevices[0] && (
                <div className="absolute bottom-12 right-12 bg-white/10 backdrop-blur-lg p-4 rounded-xl border border-white/20 shadow-xl z-20 hidden md:block">
                    <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden relative">
                        <Image 
                        src={heroSection.featuredDevices[0].image}
                        alt={heroSection.featuredDevices[0].name}
                        fill
                        className="object-cover"
                        />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-white text-sm font-medium">{heroSection.featuredDevices[0].name}</span>
                        <span className="text-white/70 text-xs">Up to {heroSection.featuredDevices[0].price}</span>
                    </div>
                    </div>
                </div>
             )}
             {heroSection.featuredDevices[1] && (
                <div className="absolute top-12 left-12 bg-white/10 backdrop-blur-lg p-4 rounded-xl border border-white/20 shadow-xl z-20 hidden md:block">
                    <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden relative">
                        <Image 
                        src={heroSection.featuredDevices[1].image}
                        alt={heroSection.featuredDevices[1].name}
                        fill
                        className="object-cover"
                        />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-white text-sm font-medium">{heroSection.featuredDevices[1].name}</span>
                        <span className="text-white/70 text-xs">Up to {heroSection.featuredDevices[1].price}</span>
                    </div>
                    </div>
                </div>
             )}
            </>
          )}
          
          <div className="absolute top-1/4 left-1/3 w-48 h-48 rounded-full bg-gradient-to-r from-[color:var(--color-primary)]/30 to-transparent blur-3xl -z-10"></div>
        </div>
      </div>
    </section>
  );
}
