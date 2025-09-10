"use client";

import { useState } from 'react';
import { DeviceEstimationVariantType } from '@/types/shop';

interface DeviceEstimationVariantSelectorProps {
  selectedVariant: DeviceEstimationVariantType;
  onChange: (variant: DeviceEstimationVariantType) => void;
  onVariantPreview?: (variant: DeviceEstimationVariantType) => void;
  primaryColor: string;
}

interface VariantOption {
  id: DeviceEstimationVariantType;
  name: string;
  description: string;
  // Placeholder for potential icon/thumbnail
  icon?: React.ReactNode;
}

const variants: VariantOption[] = [
  {
    id: 'default',
    name: 'Default Layout',
    description: 'Split view with device info on the left, questions on the right.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 12" fill="currentColor" className="w-6 h-6">
        <path d="M0 0h6v12H0zM8 0h12v5H8zM8 7h12v5H8z"/>
      </svg>
    )
  },
  {
    id: 'compact-stepper',
    name: 'Compact Stepper',
    description: 'Single column layout, device info followed by questions/results.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 12" fill="currentColor" className="w-6 h-6">
         <path d="M0 0h20v4H0zM0 6h20v6H0z"/>
      </svg>
    )
  },
  {
    id: 'image-prominent',
    name: 'Image Prominent',
    description: 'Larger device image presentation with questions below or beside.',
     icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 12" fill="currentColor" className="w-6 h-6">
        <path d="M0 0h10v12H0zM12 0h8v4h-8zM12 6h8v6h-8z"/>
      </svg>
    )
  },
];

export function DeviceEstimationVariantSelector({
  selectedVariant,
  onChange,
  onVariantPreview,
  primaryColor,
}: DeviceEstimationVariantSelectorProps) {
  const [hoveredVariant, setHoveredVariant] = useState<DeviceEstimationVariantType | null>(null);

  const handleSelectVariant = (variant: DeviceEstimationVariantType) => {
    onChange(variant);
    if (onVariantPreview) {
      onVariantPreview(variant);
    }
  };

  const handleMouseEnter = (variant: DeviceEstimationVariantType) => {
    setHoveredVariant(variant);
    if (onVariantPreview) {
      onVariantPreview(variant);
    }
  };

  const handleMouseLeave = () => {
    setHoveredVariant(null);
    if (onVariantPreview) {
      onVariantPreview(selectedVariant); // Revert preview to selected on mouse leave
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Page Layout</h4>
      {variants.map((variant) => (
        <button
          key={variant.id}
          type="button"
          onClick={() => handleSelectVariant(variant.id)}
          onMouseEnter={() => handleMouseEnter(variant.id)}
          onMouseLeave={handleMouseLeave}
          className={`w-full p-4 border rounded-lg text-left transition-all duration-200 ease-in-out transform hover:shadow-md 
            ${selectedVariant === variant.id 
              ? 'border-2 shadow-sm' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
            ${hoveredVariant === variant.id ? 'ring-2' : ''}
          `}
          style={{
            borderColor: selectedVariant === variant.id || hoveredVariant === variant.id ? primaryColor : undefined,
            boxShadow: selectedVariant === variant.id || hoveredVariant === variant.id ? `0 0 0 2px ${primaryColor}20` : undefined,
            // Ring color is handled by Tailwind focus classes or global config usually
          }}
          aria-current={selectedVariant === variant.id}
        >
          <div className="flex items-center space-x-4">
            {variant.icon && (
              <div 
                className="w-10 h-10 rounded-md flex items-center justify-center text-white bg-gray-200 dark:bg-gray-700"
                style={{ backgroundColor: selectedVariant === variant.id || hoveredVariant === variant.id ? primaryColor : undefined }}
              >
                <span className={selectedVariant === variant.id || hoveredVariant === variant.id ? 'text-white' : 'text-gray-500 dark:text-gray-400'}>
                    {variant.icon}
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100">{variant.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{variant.description}</p>
            </div>
          </div>
          {selectedVariant === variant.id && (
            <div className="absolute top-2 right-2 p-0.5 rounded-full" style={{ backgroundColor: primaryColor }}>
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