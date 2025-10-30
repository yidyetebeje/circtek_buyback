"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { HeaderVariantType } from "../layout/header-variants";

interface HeaderVariantSelectorProps {
  value: HeaderVariantType;
  onChange: (newValue: HeaderVariantType) => void;
}

export function HeaderVariantSelector({ value, onChange }: HeaderVariantSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<HeaderVariantType>(value || 'default');
  
  useEffect(() => {
    // Update selected variant when prop changes
    setSelectedVariant(value || 'default');
  }, [value]);
  
  const handleVariantChange = (variant: HeaderVariantType) => {
    setSelectedVariant(variant);
    onChange(variant);
  };
  
  // Preview images for each variant
  const variantPreviews = {
    default: "/images/header-previews/default-header.png",
    compact: "/images/header-previews/compact-header.png",
    expanded: "/images/header-previews/expanded-header.png",
    benefits: "/images/header-previews/benefits-header.png",
    modern: "/images/header-previews/modern-header.png",
    thePhoneLab: "/images/header-previews/thephonelab-header.png",
  };
  
  // Variant descriptions
  const variantDescriptions = {
    default: "Standard header with logo, navigation, and action buttons",
    compact: "Smaller header with minimal space usage",
    expanded: "Two-tier header with contact information and social media",
    benefits: "Header with key benefits/USPs displayed prominently", 
    modern: "Clean modern design with key benefits integrated into navigation",
    thePhoneLab: "Header with centered logo, top benefits bar, and distinct styling from image",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-2">Select a header layout style:</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(variantPreviews).map(([variant, previewPath]) => (
          <div 
            key={variant}
            className={`border rounded-lg p-3 cursor-pointer transition-all ${
              selectedVariant === variant ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleVariantChange(variant as HeaderVariantType)}
          >
            <div className="aspect-[4/1] relative mb-2 bg-gray-50 rounded overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                {/* Display placeholder if image fails to load */}
                <span>{variant.charAt(0).toUpperCase() + variant.slice(1)} Header</span>
              </div>
              <Image 
                src={previewPath} 
                alt={`${variant} header variant`}
                fill
                sizes="(max-width: 768px) 100vw, 300px"
                style={{ objectFit: "cover" }}
                className="z-10"
                // Don't cause errors if preview images don't exist yet
                onError={(e) => {
                  e.currentTarget.style.opacity = "0";
                }}
              />
            </div>
            <h3 className="font-medium capitalize">
              {variant.charAt(0).toUpperCase() + variant.slice(1)}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {variantDescriptions[variant as HeaderVariantType]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
