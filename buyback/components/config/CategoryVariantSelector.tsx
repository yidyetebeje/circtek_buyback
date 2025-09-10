import { useState } from 'react';

import { CategoryVariantType } from '../homepage/category-variants';

interface CategoryVariantSelectorProps {
  selectedVariant: CategoryVariantType;
  onChange: (variant: CategoryVariantType) => void;
  onVariantPreview?: (variant: CategoryVariantType) => void; // Optional callback for instant preview
  primaryColor: string;
}

interface VariantOption {
  id: CategoryVariantType;
  name: string;
  description: string;
  thumbnail: string;
}

export function CategoryVariantSelector({ selectedVariant, onChange, onVariantPreview, primaryColor }: CategoryVariantSelectorProps) {
  // Toggle to show / hide the inline variant list
  const [showSelector, setShowSelector] = useState(false);

  // Define variants with descriptions and thumbnails
  const variants: VariantOption[] = [
    {
      id: 'default',
      name: 'Classic',
      description: 'Traditional cards with images and description',
      thumbnail: '/images/category-variants/default.jpg', // These would be actual thumbnails of each variant
    },
    {
      id: 'grid',
      name: 'Grid',
      description: 'Compact grid layout with hover effects',
      thumbnail: '/images/category-variants/grid.jpg',
    },
    {
      id: 'carousel',
      name: 'Carousel',
      description: 'Horizontal scrolling cards with large images',
      thumbnail: '/images/category-variants/carousel.jpg',
    },
    {
      id: 'minimalist',
      name: 'Minimalist',
      description: 'Clean icon-based design with subtle animations',
      thumbnail: '/images/category-variants/minimalist.jpg',
    },
    {
      id: 'featuredButtons',
      name: 'Featured Buttons',
      description: 'Clean product grid with prominent colored buttons',
      thumbnail: '/images/category-variants/featuredButtons.jpg',
    },
  ];

  // Get the currently selected variant details
  const selectedVariantDetails = variants.find(v => v.id === selectedVariant) || variants[0];

  // Toggle handler for the main card
  const toggleSelector = () => setShowSelector((prev) => !prev);

  return (
    <div className="space-y-4">
      <div 
        className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 transition-all"
        onClick={toggleSelector}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{selectedVariantDetails.name}</h3>
            <p className="text-sm text-gray-500">{selectedVariantDetails.description}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            {/* Eye icon to indicate preview */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S3.732 16.057 2.458 12z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Inline Variant Selector (replaces modal) */}
      {showSelector && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                selectedVariant === variant.id ? 'ring-2 ring-offset-2' : 'hover:border-gray-300'
              }`}
              style={{
                ...(selectedVariant === variant.id ? { outline: `2px solid ${primaryColor}`, outlineOffset: '2px' } : {})
              }}
              onClick={() => {
                onChange(variant.id);
                if (onVariantPreview) onVariantPreview(variant.id);
                // Collapse list after selection for cleaner UX
                setShowSelector(false);
              }}
              onMouseEnter={() => {
                if (onVariantPreview) onVariantPreview(variant.id);
              }}
              onMouseLeave={() => {
                if (onVariantPreview) onVariantPreview(selectedVariant);
              }}
            >
              <div className="relative h-40 bg-gray-100 border-b">
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Placeholder for thumbnail */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="absolute top-2 right-2">
                  {selectedVariant === variant.id && (
                    <div
                      className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center"
                      style={{ color: primaryColor }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium">{variant.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{variant.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
