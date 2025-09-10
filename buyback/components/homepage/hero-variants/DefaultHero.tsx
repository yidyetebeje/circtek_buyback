import Image from "next/image";
import { AutocompleteSearch } from "../../shared/AutocompleteSearch";
import { HeroVariantProps } from "./index";
import { Model } from "@/types/catalog";
import { useHeroTranslationContent } from "@/hooks/catalog/useHeroTranslations";

// Updated Props for DefaultHero
interface DefaultHeroProps extends Omit<HeroVariantProps, 'onSearch'> {
  shopId: number;
  onSelectModel: (model: Model) => void;
}

export function DefaultHero({ 
  heroSection, 
  primaryColor, 
  shopId, // Use passed shopId
  onSelectModel // Use new onSelectModel prop
}: DefaultHeroProps) {

  // Get translated content using the translation hook with static fallbacks
  const translatedContent = useHeroTranslationContent(heroSection, true);

  // The internal handleModelSelect now directly calls the onSelectModel from props
  const handleModelSelect = (model: Model) => {
    onSelectModel(model); 
  };

  return (
    <section className="relative w-full overflow-hidden min-h-[85vh] flex items-center">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30 z-10" />
        <Image
          src={heroSection.backgroundImage}
          alt="Background"
          fill
          priority
          className="object-cover object-center scale-105 animate-slow-zoom"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col max-w-2xl space-y-8 py-8">
          <span 
            className="text-sm uppercase tracking-[0.2em] font-medium inline-block mb-2 text-white/80 bg-white/10 px-4 py-2 backdrop-blur-sm rounded-full"
            style={{ borderLeft: `3px solid ${primaryColor}` }}
          >
            {translatedContent.tagline || translatedContent.getStaticText('HeroVariants.tradeInCashOut')}
          </span>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            {translatedContent.title.split(' ').map((word, i) => (
              <span key={i} className={i % 3 === 0 ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70' : ''}>
                {word}{' '}
              </span>
            ))}
          </h1>
          
          <h2 className="text-xl md:text-2xl font-medium text-white/90">
            {translatedContent.subtitle}
          </h2>
          
          {translatedContent.description && (
            <p className="text-base md:text-lg text-white/80 max-w-xl leading-relaxed">
              {translatedContent.description}
            </p>
          )}
          
          {/* Device Search - AutocompleteSearch uses shopId from props and calls onSelectModel */}
          <div className="pt-4 w-full">
            <AutocompleteSearch 
              shopId={shopId} // Use shopId from props
              primaryColor={primaryColor} 
              onSelectModel={handleModelSelect} // This now correctly bubbles up to HeroSection
              placeholder={translatedContent.getSearchPlaceholder()}
            />
            <p className="text-white/60 text-sm mt-3 ml-4">
              {translatedContent.getStaticText('HeroVariants.popularDevices')}
            </p>
          </div>

          <div className="flex items-center gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden">
                  <Image 
                    src="https://imageio.forbes.com/specials-images/imageserve/66feb922afb1f2747d65b116/Apple-iPhone-16-finish-lineup-240909/960x0.jpg?format=jpg&width=960" 
                    alt="Customer" 
                    width={40} 
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="text-white/80 text-sm">
              <span className="font-semibold">4,500+</span> {translatedContent.getStaticText('HeroVariants.customersThisMonth').replace('4,500+ ', '')}
            </div>
          </div>
        </div>
      </div>

      {/* Modern decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/30 to-transparent z-5"></div>
      <div className="absolute top-1/4 right-10 w-64 h-64 rounded-full bg-gradient-to-br from-[color:var(--color-primary)]/20 to-transparent blur-3xl"></div>
    </section>
  );
}
