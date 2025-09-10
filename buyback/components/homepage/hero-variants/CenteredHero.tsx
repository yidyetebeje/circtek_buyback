import Image from "next/image";
import { AutocompleteSearch } from "../../shared/AutocompleteSearch";
import { HeroVariantProps } from "./index";
import { useHeroTranslationContent } from "@/hooks/catalog/useHeroTranslations";

export function CenteredHero({ 
  heroSection, 
  primaryColor, 
  shopId,
  onSelectModel
}: HeroVariantProps) {
  // Get translated content using the translation hook
  const translatedContent = useHeroTranslationContent(heroSection);

  return (
    <section className="relative w-full overflow-hidden min-h-[85vh] flex items-center justify-center">
      {/* Background with dark overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/75 z-10" />
        <Image
          src={heroSection.backgroundImage}
          alt="Background"
          fill
          priority
          className="object-cover object-center"
        />
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 text-center pt-16">
        <div className="max-w-3xl mx-auto flex flex-col items-center space-y-8">
          {/* Badge */}
          <div 
            className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm inline-flex items-center gap-2"
            style={{ border: `1px solid ${primaryColor}` }}
          >
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></span>
            <span className="text-white text-sm">{translatedContent.trustBadge || "Trusted by 10,000+ customers"}</span>
          </div>
          
          {/* Title with animated gradient */}
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/80 animate-gradient-x leading-tight">
            {translatedContent.title}
          </h1>
          
          {/* Subtitle */}
          <h2 className="text-xl md:text-2xl font-medium text-white/90 max-w-2xl">
            {translatedContent.subtitle}
          </h2>
          
          {/* Description with optional rendering */}
          {translatedContent.description && (
            <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto">
              {translatedContent.description}
            </p>
          )}
          
          {/* Search box */}
          <div className="w-full max-w-xl mx-auto mt-8">
            <AutocompleteSearch 
              shopId={shopId} 
              primaryColor={primaryColor} 
              onSelectModel={onSelectModel} 
              placeholder="What device are you selling?"
            />
            <p className="text-white/60 text-sm mt-3">
              Popular: iPhone 16, Samsung Galaxy S24, MacBook Pro...
            </p>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-12 w-full max-w-2xl">
            {(heroSection.stats && heroSection.stats.length > 0 ? heroSection.stats : [
              { label: "Fast Payment", value: "24h" },
              { label: "Secure", value: "100%" },
              { label: "Rating", value: "4.9/5" },
            ]).slice(0,3).map(stat => (
              <div key={stat.label} className="flex flex-col items-center">
                <span className="text-3xl font-bold text-white">{stat.value}</span>
                <span className="text-sm text-white/60 mt-1">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-[color:var(--color-primary)]/20 to-transparent blur-3xl"></div>
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bg-gradient-to-tl from-[color:var(--color-secondary)]/20 to-transparent blur-3xl"></div>
      
      {/* Device mockups */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-5xl mx-auto flex justify-center gap-4 md:gap-8 z-20 opacity-90">
        <div className="w-16 h-32 md:w-24 md:h-48 relative rounded-xl overflow-hidden shadow-lg transform -rotate-12">
          <Image 
            src="https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aXBob25lfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60" 
            alt="iPhone"
            fill
            className="object-cover"
          />
        </div>
        <div className="w-20 h-40 md:w-32 md:h-64 relative rounded-xl overflow-hidden shadow-lg z-30">
          <Image 
            src="https://images.unsplash.com/photo-1581993192214-9a6f6239b169?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c21hcnRwaG9uZXxlbnwwfDF8MHx8fDA%3D&auto=format&fit=crop&w=800&q=60" 
            alt="Smartphone"
            fill
            className="object-cover"
          />
        </div>
        <div className="w-16 h-32 md:w-24 md:h-48 relative rounded-xl overflow-hidden shadow-lg transform rotate-12">
          <Image 
            src="https://images.unsplash.com/photo-1598327105666-5b89351aff97?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c2Ftc3VuZyUyMGdhbGF4eXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60" 
            alt="Samsung"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
