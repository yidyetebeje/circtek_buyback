import { DefaultHeader } from './DefaultHeader';
import { CompactHeader } from './CompactHeader';
import { ExpandedHeader } from './ExpandedHeader';
import { BenefitsHeader } from './BenefitsHeader';
import { ModernHeader } from './ModernHeader';
import { ThePhoneLabHeader } from './ThePhoneLabHeader';
import { HeaderVariantType } from './index';

// Map of variant types to their respective components
export const HeaderVariants = {
  default: DefaultHeader,
  compact: CompactHeader,
  expanded: ExpandedHeader,
  benefits: BenefitsHeader,
  modern: ModernHeader,
  thePhoneLab: ThePhoneLabHeader,
};

// Function to get the component for a specific variant
export const getHeaderVariant = (variant: HeaderVariantType) => {
  return HeaderVariants[variant] || HeaderVariants.default;
};
