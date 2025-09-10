import { DefaultCategory } from "./DefaultCategory";
import { GridCategory } from "./GridCategory";
import { CarouselCategory } from "./CarouselCategory";
import { MinimalistCategory } from "./MinimalistCategory";
import { FeaturedButtonsCategory } from "./FeaturedButtonsCategory";
import { FC } from 'react';
import { CategoryTranslation, CategoryWithTranslations } from '@/utils/categoryTranslationUtils';
import { CategoryTextConfig } from '@/types/shop';

// Define the shape of a single category item, aligning with backend API response structure
export interface CategoryType extends CategoryWithTranslations {
  imageUrl?: string; // Backend might send a different field for images
  link?: string; // Link might be constructed differently or not included
  translations?: CategoryTranslation[];
}

export interface CategoryVariantProps {
  categories: CategoryType[];
  primaryColor: string;
  title?: string;
  subtitle?: string;
  categoryTextConfig?: CategoryTextConfig;
}

// Define CategoryVariantType first to break circular dependency
export type CategoryVariantType = 'default' | 'grid' | 'carousel' | 'minimalist' | 'featuredButtons';

// Explicit type for the components stored in CategoryVariants
type CategoryComponentType = FC<CategoryVariantProps>;

export const CategoryVariants: { [key in CategoryVariantType]: CategoryComponentType } = {
  default: DefaultCategory,
  grid: GridCategory,
  carousel: CarouselCategory,
  minimalist: MinimalistCategory,
  featuredButtons: FeaturedButtonsCategory
};

export { 
  DefaultCategory, 
  GridCategory, 
  CarouselCategory, 
  MinimalistCategory,
  FeaturedButtonsCategory
}; // CategoryType is already exported
