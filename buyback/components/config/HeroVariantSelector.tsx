import { useState } from 'react';

export type HeroVariantType = 'default' | 'split' | 'centered' | 'gradient' | 'video' | 'minimalist' | 'simple';

interface HeroVariantSelectorProps {
  selectedVariant: HeroVariantType;
  onChange: (variant: HeroVariantType) => void;
  onVariantPreview?: (variant: HeroVariantType) => void; // Optional callback for instant preview
  primaryColor: string;
}

interface VariantOption {
  id: HeroVariantType;
  name: string;
  description: string;
  thumbnail: string;
}

export function HeroVariantSelector({ selectedVariant, onChange, onVariantPreview, primaryColor }: HeroVariantSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Define variants with descriptions and thumbnails
  const variants: VariantOption[] = [
    {
      id: 'default',
      name: 'Classic',
      description: 'Traditional hero with gradient overlay and prominent headline',
      thumbnail: '/images/hero-variants/default.jpg', // These would be actual thumbnails of each variant
    },
    {
      id: 'split',
      name: 'Split',
      description: 'Two-column layout with content and featured device images',
      thumbnail: '/images/hero-variants/split.jpg',
    },
    {
      id: 'centered',
      name: 'Centered',
      description: 'All content centered with surrounding device mockups',
      thumbnail: '/images/hero-variants/centered.jpg',
    },
    {
      id: 'gradient',
      name: 'Gradient',
      description: 'Modern gradient background with floating device cards',
      thumbnail: '/images/hero-variants/gradient.jpg',
    },
    {
      id: 'minimalist',
      name: 'Minimalist',
      description: 'Clean and minimal design with subtle patterns',
      thumbnail: '/images/hero-variants/minimalist.jpg',
    },
    {
      id: 'video',
      name: 'Video',
      description: 'Dynamic video background with floating price cards',
      thumbnail: '/images/hero-variants/video.jpg',
    },
    {
      id: 'simple',
      name: 'Simple',
      description: 'Clean layout with a title, search bar, and subtitle.',
      thumbnail: '/images/hero-variants/simple.jpg', // Placeholder thumbnail
    },
  ];

  // Get the currently selected variant details
  const selectedVariantDetails = variants.find(v => v.id === selectedVariant) || variants[0];

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="space-y-4">
      <div 
        className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 transition-all"
        onClick={openModal}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{selectedVariantDetails.name}</h3>
            <p className="text-sm text-gray-500">{selectedVariantDetails.description}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Variant Selector Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white rounded-xl shadow-2xl z-[100] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Select Hero Style</h2>
                <button 
                  onClick={closeModal}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    selectedVariant === variant.id ? 'ring-2 ring-offset-2' : 'hover:border-gray-300'
                  }`}
                  style={{ 
                    borderColor: selectedVariant === variant.id ? primaryColor : '', 
                    boxShadow: selectedVariant === variant.id ? `0 0 0 2px ${primaryColor}20` : ''
                  }}
                  onClick={() => {
                    onChange(variant.id);
                    // Call preview function immediately if provided
                    if (onVariantPreview) {
                      onVariantPreview(variant.id);
                    }
                    closeModal();
                  }}
                >
                  <div className="aspect-video bg-gray-100 relative w-full">
                    {/* Here we would ideally have actual thumbnails showing the hero variants */}
                    {/* For now we'll use placeholders */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                      <span className="text-gray-500 font-medium">{variant.name} Style</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium">{variant.name}</h3>
                    <p className="text-sm text-gray-500">{variant.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-5 border-t flex justify-end">
              <button
                className="px-4 py-2 rounded-md text-white"
                style={{ backgroundColor: primaryColor }}
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
