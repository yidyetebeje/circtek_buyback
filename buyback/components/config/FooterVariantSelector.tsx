"use client";

import { useState } from 'react';
import { FooterVariantType } from '../layout/footer-variants'; // Ensure this path is correct and index.ts exports it

export interface FooterVariantSelectorProps {
  selectedVariant: FooterVariantType;
  onChange: (variant: FooterVariantType) => void;
  onVariantPreview?: (variant: FooterVariantType) => void;
  primaryColor: string;
}

interface VariantOption {
  id: FooterVariantType;
  name: string;
  description: string;
  thumbnail: string; // In a real implementation, you would have actual thumbnail images
}

const ALL_FOOTER_VARIANT_TYPES: FooterVariantType[] = ['default', 'minimal', 'expanded', 'variant4'];

export function FooterVariantSelector({ 
  selectedVariant, 
  onChange, 
  onVariantPreview, 
  primaryColor 
}: FooterVariantSelectorProps) {
  // Ensure selectedVariant is a valid type, default if not
  const currentSelectedVariant = ALL_FOOTER_VARIANT_TYPES.includes(selectedVariant) ? selectedVariant : 'default';
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Define footer variants with descriptions and thumbnails
  const variants: VariantOption[] = [
    {
      id: 'default',
      name: 'Classic',
      description: 'Standard multi-column footer with company info, links, and social media',
      thumbnail: '/images/footer-variants/default.jpg', // These would be actual thumbnails in production
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Simplified single-row footer with essential information only',
      thumbnail: '/images/footer-variants/minimal.jpg',
    },
    {
      id: 'expanded',
      name: 'Expanded',
      description: 'Feature-rich footer with enhanced styling and comprehensive information',
      thumbnail: '/images/footer-variants/expanded.jpg',
    },
    {
      id: 'variant4',
      name: 'ThePhoneLab Style',
      description: 'Custom 4-column layout with specific sections for ThePhoneLab.',
      thumbnail: '/images/footer-variants/variant4.jpg', // Placeholder thumbnail
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
                <h2 className="text-xl font-bold">Select Footer Style</h2>
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
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {variants.map((variant) => (
                <div 
                  key={variant.id}
                  className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${selectedVariant === variant.id ? 'ring-2 ring-offset-2' : 'hover:border-gray-300'}`}
                  style={{
                    ...(selectedVariant === variant.id ? { outline: `2px solid ${primaryColor}`, outlineOffset: '2px' } : {})
                  }}
                  onClick={() => {
                    onChange(variant.id);
                    if (onVariantPreview) onVariantPreview(variant.id);
                    closeModal();
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
                      {/* This would be an actual thumbnail in a real implementation */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium">{variant.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{variant.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t">
              <p className="text-sm text-gray-500">
                Selecting a footer style will change the layout and presentation of your site footer.
                You can customize the content and colors after selecting a style.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
