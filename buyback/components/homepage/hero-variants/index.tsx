import { DefaultHero } from "./DefaultHero";
import { SplitHero } from "./SplitHero";
import { CenteredHero } from "./CenteredHero";
import { GradientHero } from "./GradientHero";
import { MinimalistHero } from "./MinimalistHero";
import { VideoHero } from "./VideoHero";
import { SimpleHero } from './SimpleHero';
import { HeroSection } from "@/types/shop";
import { Model } from "@/types/catalog";

export const HeroVariants = {
  default: DefaultHero,
  split: SplitHero,
  centered: CenteredHero,
  gradient: GradientHero,
  minimalist: MinimalistHero,
  video: VideoHero,
  simple: SimpleHero,
};

export type HeroVariantProps = {
  heroSection: HeroSection;
  primaryColor: string;
  shopId: number;
  onSelectModel: (model: Model) => void;
};

export { DefaultHero, SplitHero, CenteredHero, GradientHero, MinimalistHero, VideoHero };
