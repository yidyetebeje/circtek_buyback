import { HeroSection as HeroSectionType } from "@/types/shop";
import { Model } from "@/types/catalog";
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { currentLanguageObjectAtom } from '@/store/atoms';
import { HeroVariants } from "./hero-variants";

interface HeroSectionProps {
  heroSection: HeroSectionType;
  primaryColor: string;
  shopId: number;
}

export function HeroSection({ heroSection, primaryColor, shopId }: HeroSectionProps) {
  const router = useRouter();
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  const currentLocale = currentLanguage?.code || 'en';

  const handleModelSelectFromHero = (model: Model) => {
    console.log("Model selected in HeroSection, navigating to estimation page:", model);
    if (model.sef_url) {
      router.push(`/${currentLocale}/sell/${model.sef_url}/estimate`);
    } else {
      console.warn(`Hero Search: Model ${model.id} does not have a sef_url. Cannot navigate.`);
    }
  };
  
  const variant = heroSection.variant || 'default';
  const HeroComponent = HeroVariants[variant as keyof typeof HeroVariants] || HeroVariants.default;
  
  return (
    <HeroComponent 
      heroSection={heroSection} 
      primaryColor={primaryColor} 
      shopId={shopId}
      onSelectModel={handleModelSelectFromHero}
    />
  );
} 