import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckoutVariantType } from './checkout-variants';

interface CheckoutVariantSelectorProps {
  selectedVariant: CheckoutVariantType;
  onChange: (variant: CheckoutVariantType) => void;
  onVariantPreview?: (variant: CheckoutVariantType) => void;
  primaryColor?: string;
}

interface VariantOption {
  id: CheckoutVariantType;
  nameKey: string;
  descriptionKey: string;
  /**
   * Two-letter (or similar) abbreviation shown instead of an image preview.
   * Example: "CS" for Classic Side-by-Side.
   */
  initials: string;
}

export function CheckoutVariantSelector({
  selectedVariant,
  onChange,
  onVariantPreview,
  primaryColor = '#3b82f6'
}: CheckoutVariantSelectorProps) {
  const t = useTranslations('Checkout.variants');
  const [hoveredVariant, setHoveredVariant] = useState<CheckoutVariantType | null>(null);

  const checkoutVariants: VariantOption[] = [
    {
      id: 'default',
      nameKey: 'classicSideBySide',
      descriptionKey: 'classicSideBySideDescription',
      initials: 'CS',
    },
    {
      id: 'split',
      nameKey: 'multiStepFlow',
      descriptionKey: 'multiStepFlowDescription',
      initials: 'MS',
    },
    {
      id: 'minimalist',
      nameKey: 'minimalistDesign',
      descriptionKey: 'minimalistDesignDescription',
      initials: 'MN',
    },
    {
      id: 'stepped',
      nameKey: 'accordionSteps',
      descriptionKey: 'accordionStepsDescription',
      initials: 'AS',
    },
    {
      id: 'card',
      nameKey: 'cardLayout',
      descriptionKey: 'cardLayoutDescription',
      initials: 'CL',
    },
  ];

  const handleMouseEnter = (variant: CheckoutVariantType) => {
    setHoveredVariant(variant);
    if (onVariantPreview) {
      onVariantPreview(variant);
    }
  };

  const handleMouseLeave = () => {
    setHoveredVariant(null);
    if (onVariantPreview && selectedVariant) {
      onVariantPreview(selectedVariant);
    }
  };

  return (
    <div className="space-y-4">
      {checkoutVariants.map((variant) => (
        <div
          key={variant.id}
          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
            selectedVariant === variant.id
              ? 'border-2 shadow-sm'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          style={{
            borderColor: selectedVariant === variant.id ? primaryColor : (hoveredVariant === variant.id ? primaryColor : ''),
            backgroundColor: selectedVariant === variant.id ? `${primaryColor}10` : 'white',
          }}
          onClick={() => onChange(variant.id)}
          onMouseEnter={() => handleMouseEnter(variant.id)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-20 h-16 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-gray-600 font-semibold text-lg">
                {variant.initials}
              </span>
            </div>
            <div className="flex-grow">
              <h3 className="font-medium">{t(variant.nameKey)}</h3>
              <p className="text-gray-500 text-sm mt-1">{t(variant.descriptionKey)}</p>
            </div>
            <div className="flex-shrink-0 ml-2">
              <div 
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedVariant === variant.id ? 'border-0' : 'border-gray-300'
                }`}
                style={{ 
                  backgroundColor: selectedVariant === variant.id ? primaryColor : 'transparent' 
                }}
              >
                {selectedVariant === variant.id && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 