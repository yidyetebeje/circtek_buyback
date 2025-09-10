"use client";

import { useState } from 'react';

export type ModelListVariantType = 
  | 'classicElegant'
  | 'card' 
  | 'grid' 
  | 'minimalist' 
  | 'gradientAccent' 
  | 'centeredFocus' 
  | 'splitView' 
  | 'floating'
  | 'featured'; // Keep featured for now as it's in the main type

interface ModelListVariantSelectorProps {
  selectedVariant: ModelListVariantType;
  onChange: (variant: ModelListVariantType) => void;
  onVariantPreview?: (variant: ModelListVariantType) => void;
  primaryColor: string;
}

const variants: { name: ModelListVariantType; label: string; description: string, icon: string }[] = [
  {
    name: 'classicElegant',
    label: 'Classic Elegant',
    description: 'Sophisticated design with elegant corner accents and subtle animations.',
    icon: 'CE'
  },
  {
    name: 'card',
    label: 'Card View',
    description: 'Classic cards with balanced image and text.',
    icon: 'Cd'
  },
  {
    name: 'grid',
    label: 'Grid View',
    description: 'Compact grid for many items, focus on images.',
    icon: 'Gr'
  },
  {
    name: 'minimalist',
    label: 'Minimalist Card',
    description: 'Clean design with ample whitespace and subtle hover.',
    icon: 'Mi'
  },
  {
    name: 'gradientAccent',
    label: 'Gradient Accent Card',
    description: 'Modern cards with gradient details and sleek animations.',
    icon: 'GA'
  },
  {
    name: 'centeredFocus',
    label: 'Centered Focus Card',
    description: 'Image-focused cards with text overlay and glow effects.',
    icon: 'CF'
  },
  {
    name: 'splitView',
    label: 'Split View Card',
    description: 'Two-column layout, alternating image and text sections.',
    icon: 'SV'
  },
  {
    name: 'floating',
    label: 'Floating Image Card',
    description: 'Cards with product images that appear to float.',
    icon: 'Fl'
  },
  {
    name: 'featured', // Placeholder for now
    label: 'Featured View',
    description: 'Prominent display for featured or special models.',
    icon: 'Ft'
  }
];

export function ModelListVariantSelector({
  selectedVariant,
  onChange,
  onVariantPreview,
  primaryColor,
}: ModelListVariantSelectorProps) {
  const [hoveredVariant, setHoveredVariant] = useState<ModelListVariantType | null>(null);

  const handleSelectVariant = (variant: ModelListVariantType) => {
    onChange(variant);
    if (onVariantPreview) {
      onVariantPreview(variant);
    }
  };

  const handleMouseEnter = (variant: ModelListVariantType) => {
    setHoveredVariant(variant);
    if (onVariantPreview) {
      onVariantPreview(variant);
    }
  };

  const handleMouseLeave = () => {
    setHoveredVariant(null);
    if (onVariantPreview) {
      onVariantPreview(selectedVariant);
    }
  };

  return (
    <div className="space-y-3">
      {variants.map((variant) => (
        <button
          key={variant.name}
          type="button"
          onClick={() => handleSelectVariant(variant.name)}
          onMouseEnter={() => handleMouseEnter(variant.name)}
          onMouseLeave={handleMouseLeave}
          className={`w-full p-4 border rounded-lg text-left transition-all duration-200 ease-in-out transform hover:shadow-lg 
            ${selectedVariant === variant.name 
              ? 'border-2 shadow-md' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${hoveredVariant === variant.name ? 'ring-2' : ''}
          `}
          style={{
            borderColor: selectedVariant === variant.name || hoveredVariant === variant.name ? primaryColor : undefined,
            boxShadow: hoveredVariant === variant.name ? `0 0 0 2px ${primaryColor}` : undefined,
          }}
        >
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-md flex items-center justify-center text-white text-sm"
              style={{ backgroundColor: primaryColor || '#cccccc' }}
            >
              {variant.icon}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{variant.label}</p>
              <p className="text-xs text-gray-500">{variant.description}</p>
            </div>
          </div>
          {selectedVariant === variant.name && (
            <div className="absolute top-2 right-2 p-1 rounded-full" style={{ backgroundColor: primaryColor }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
