import { AutocompleteSearch } from "../../shared/AutocompleteSearch";
import { HeroVariantProps } from "./index";
import { Model } from "@/types/catalog";
import { useHeroTranslationContent } from "@/hooks/catalog/useHeroTranslations";

interface SimpleHeroProps extends Omit<HeroVariantProps, 'onSearch'> {
  shopId: number;
  onSelectModel: (model: Model) => void;
  backgroundColor?: string; // Prop for customizable background color
}

export function SimpleHero({
  heroSection,
  primaryColor, // May be used for search bar or accents
  shopId,
  onSelectModel,
  backgroundColor = '#F8F7F4' // Default background color from image
}: SimpleHeroProps) {
  // Get translated content using the translation hook
  const translatedContent = useHeroTranslationContent(heroSection);
  
  const handleModelSelect = (model: Model) => {
    onSelectModel(model);
  };
 

  return (
    <section 
      className="pt-20 relative w-full  flex flex-col items-center justify-center text-center px-4"
    >
      <div className="container mx-auto max-w-2xl flex flex-col gap-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black leading-tight">
          {translatedContent.title}
        </h1>

        <div className="w-full max-w-lg mx-auto">
          <AutocompleteSearch
            shopId={shopId}
            primaryColor={primaryColor} // Or a specific color for the search bar
            onSelectModel={handleModelSelect}
            placeholder="Search Product..." // Placeholder from the image
          />
        </div>
    
      </div>
    </section>
  );
} 