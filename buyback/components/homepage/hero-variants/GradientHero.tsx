import { AutocompleteSearch } from "../../shared/AutocompleteSearch";
import { HeroVariantProps } from "./index";
import Image from "next/image";
import { useHeroTranslationContent } from "@/hooks/catalog/useHeroTranslations";

export function GradientHero({ 
  heroSection, 
  primaryColor, 
  shopId,
  onSelectModel
}: HeroVariantProps) {
  // Get translated content using the translation hook
  const translatedContent = useHeroTranslationContent(heroSection);
  
  // Use variant-specific gradient colors or fall back to defaults
  const gradientStart = heroSection.gradientStart || '#111827';
  const gradientEnd = heroSection.gradientEnd || primaryColor;
  
  const gradientStyle = {
    background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
  };

  return (
    <section className="relative w-full overflow-hidden min-h-[85vh] flex items-center py-8 md:py-16 lg:py-20" style={gradientStyle}>
      {/* Abstract shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <radialGradient id="gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="white" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="white" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <circle cx="20" cy="20" r="20" fill="url(#gradient)" />
            <circle cx="70" cy="40" r="30" fill="url(#gradient)" />
            <circle cx="40" cy="80" r="25" fill="url(#gradient)" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* Left content */}
          <div className="w-full lg:w-1/2 flex flex-col space-y-6 md:space-y-8 text-center lg:text-left">
            {/* Tagline - get from translations if available */}
            <span 
              className="text-xs sm:text-sm uppercase tracking-widest font-medium inline-block mb-2 text-white/80 bg-white/10 px-3 sm:px-4 py-2 backdrop-blur-sm rounded-full self-center lg:self-start"
              style={{ borderLeft: `3px solid white` }}
            >
              {translatedContent.tagline || "Sell your devices with confidence"}
            </span>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {translatedContent.title}
            </h1>
            
            <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-white/90">
              {translatedContent.subtitle}
            </h2>
            
            {translatedContent.description && (
              <p className="text-sm sm:text-base md:text-lg text-white/80 max-w-xl mx-auto lg:mx-0">
                {translatedContent.description}
              </p>
            )}
            
            {/* Device Search */}
            <div className="pt-2 md:pt-4 w-full max-w-xl mx-auto lg:mx-0">
              <AutocompleteSearch 
                shopId={shopId} 
                primaryColor={primaryColor} 
                onSelectModel={onSelectModel} 
                placeholder="Search any device... (e.g. iPhone 15)"
              />
              <p className="text-white/60 text-xs sm:text-sm mt-2 sm:mt-3 ml-2 sm:ml-4">
                Popular: iPhone 16, Samsung Galaxy S24, MacBook Pro...
              </p>
            </div>
            
            {/* Trust badges - use customized or defaults */}
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-4 sm:gap-6 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/10">
              {/* Use custom trust indicators if provided, otherwise use defaults */}
              {heroSection.trustIndicators && heroSection.trustIndicators.length > 0 ? (
                // Map through custom trust indicators
                heroSection.trustIndicators.map((indicator, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-white/10 flex items-center justify-center">
                      {/* Use custom icon or default check icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 sm:w-5 h-4 sm:h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <span className="text-white/90 text-xs sm:text-sm">{indicator.label}</span>
                  </div>
                ))
              ) : (
                // Default trust indicators
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 sm:w-5 h-4 sm:h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <span className="text-white/90 text-xs sm:text-sm">Best Price Guarantee</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 sm:w-5 h-4 sm:h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <span className="text-white/90 text-xs sm:text-sm">Fast Payment</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 sm:w-5 h-4 sm:h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0-1.268-.63-2.39-1.593-3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c1.268 0 2.39-.63 3.068-1.593a3.746 3.746 0 0 1 3.296-1.043 3.745 3.745 0 0 1 1.043-3.296A3.745 3.745 0 0 1 21 12Z" />
                      </svg>
                    </div>
                    <span className="text-white/90 text-xs sm:text-sm">100% Secure Process</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Right content - Device Display */}
          <div className="w-full lg:w-1/2 mt-8 lg:mt-0 flex items-center justify-center relative">
            <div className="relative w-full max-w-sm sm:max-w-md aspect-[4/5] bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/10 shadow-xl">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {[
                  {name: "iPhone 16 Pro", price: "$750", img: "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aXBob25lfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60"},
                  {name: "Galaxy S24", price: "$650", img: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c2Ftc3VuZyUyMGdhbGF4eXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60"},
                  {name: "MacBook Pro", price: "$1200", img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWFjYm9va3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60"},
                  {name: "iPad Pro", price: "$550", img: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aXBhZHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60"}
                ].map((device, i) => (
                  <div key={i} className="relative overflow-hidden rounded-lg bg-white/5 p-2 sm:p-3 flex flex-col">
                    <div className="w-full aspect-square relative rounded-md overflow-hidden">
                      <Image 
                        src={device.img} 
                        alt={device.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="mt-2 sm:mt-3">
                      <h3 className="text-white text-xs sm:text-sm font-medium truncate">{device.name}</h3>
                      <p className="text-white/70 text-xs">Up to {device.price}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="absolute -top-6 sm:-top-8 -right-6 sm:-right-8 w-12 sm:w-16 h-12 sm:h-16 rounded-full flex items-center justify-center text-center" style={{backgroundColor: primaryColor}}>
                <span className="text-white text-xs sm:text-sm font-bold leading-tight">TOP<br/>PRICES</span>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -z-10 w-64 sm:w-72 h-64 sm:h-72 rounded-full bg-white/5 blur-3xl"></div>
            <div className="absolute -top-20 -right-20 w-32 sm:w-40 h-32 sm:h-40 rounded-full" style={{background: `radial-gradient(circle, ${primaryColor}40 0%, transparent 70%)`}}></div>
          </div>
        </div>
      </div>
    </section>
  );
}
