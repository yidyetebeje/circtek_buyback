import Image from 'next/image';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { CategoryVariantProps } from './index';
import { useRef, useState, useEffect } from 'react';
import { currentLanguageObjectAtom } from '@/store/atoms';
import { getTranslatedCategoryContent } from '@/utils/categoryTranslationUtils';
import { useCategoryText } from '@/utils/categoryTextUtils';

export function CarouselCategory({ categories, primaryColor, title, subtitle, categoryTextConfig }: CategoryVariantProps) {
  // Create a ref for the carousel container
  const carouselRef = useRef<HTMLDivElement>(null);
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  const { getCategoryText } = useCategoryText(categoryTextConfig, currentLanguage?.code || 'en');
  
  // State for tracking scroll position and ability to scroll
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Function to check scroll state
  const checkScrollState = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1); // -1 to account for rounding
    }
  };

  // Check initial scroll state and set up event listener
  useEffect(() => {
    checkScrollState();
    
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', checkScrollState);
      // Also check on resize in case the container size changes
      window.addEventListener('resize', checkScrollState);
      
      return () => {
        carousel.removeEventListener('scroll', checkScrollState);
        window.removeEventListener('resize', checkScrollState);
      };
    }
  }, [categories]); // Re-run when categories change

  // Function to scroll carousel left
  const scrollLeft = () => {
    if (carouselRef.current && canScrollLeft) {
      const scrollDistance = 320; // Approximate width of a card plus margin
      carouselRef.current.scrollBy({
        left: -scrollDistance,
        behavior: 'smooth',
      });
    }
  };

  // Function to scroll carousel right
  const scrollRight = () => {
    if (carouselRef.current && canScrollRight) {
      const scrollDistance = 320; // Approximate width of a card plus margin
      carouselRef.current.scrollBy({
        left: scrollDistance,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-20 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-white z-0"></div>
      <div className="absolute right-0 top-0 w-1/3 h-full bg-gray-50/50 z-0 skew-x-12 translate-x-20"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-12">
          <div className="inline-flex items-center space-x-2 mb-3">
            <div className="w-10 h-1" style={{ backgroundColor: primaryColor }}></div>
            <span 
              className="text-sm font-semibold"
              style={{ color: primaryColor }}
            >
              {title || getCategoryText('browseCategories')}
            </span>
          </div>
          
          <div className="md:flex md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{title || getCategoryText('sellDevicesWithEase')}</h2>
              <p className="text-gray-600">{subtitle || getCategoryText('scrollThroughDevices')}</p>
            </div>
            
            <div className="hidden md:flex items-center mt-6 md:mt-0">
              {canScrollLeft && (
                <button 
                  className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center mr-3 hover:bg-gray-50 transition-colors"
                  aria-label="Scroll left"
                  onClick={scrollLeft}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
              )}
              {canScrollRight && (
                <button 
                  className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label="Scroll right"
                  onClick={scrollRight}
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Horizontal scrollable area */}
        <div className="relative -mx-4">
          <div ref={carouselRef} className="flex overflow-x-auto pb-8 pl-4 snap-x snap-mandatory hide-scrollbar scroll-smooth">
            {categories.map((category) => {
              // Get translated content for current language
              const translatedContent = getTranslatedCategoryContent(category, currentLanguage || { code: 'en', name: 'English' });
              const displayName = translatedContent.title;
              
              return (
                <Link
                  key={category.id}
                  href={category.link || `/category/${category.id}/models`}
                  className="snap-start shrink-0 group w-80 mr-6 last:mr-4 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                  style={{ boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}
                >
                  <div className="relative h-64 w-full overflow-hidden">
                    {category.imageUrl ? (
                      <Image
                        src={category.imageUrl}
                        alt={`${displayName} category image`}
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-gray-400">No image available</span>
                      </div>
                    )}
                    <div 
                      className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-70 group-hover:opacity-80 transition-opacity"
                    ></div>
                    <div 
                      className="absolute bottom-0 left-0 right-0 px-6 py-5 text-white transform"
                    >
                      <h3 className="text-xl font-bold mb-1 drop-shadow-sm">{displayName}</h3>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span 
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full mr-3"
                          style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </span>
                        <span className="font-medium">{getCategoryText('getQuote')}</span>
                      </div>
                      
                      <span 
                        className="text-sm px-3 py-1 rounded-full"
                        style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
                      >
                        {getCategoryText('viewAll')}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          
          {/* Mobile scrolling indicators and controls */}
          {(canScrollLeft || canScrollRight) && (
            <div className="flex justify-center mt-6 md:hidden">
              <div className="flex items-center space-x-4">
                {canScrollLeft && (
                  <button
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    aria-label="Scroll left"
                    onClick={scrollLeft}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                  </button>
                )}
                
                <div className="flex space-x-2">
                  {Array.from({ length: Math.min(5, categories.length) }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-gray-800' : 'bg-gray-300'}`}
                    ></div>
                  ))}
                </div>
                
                {canScrollRight && (
                  <button
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    aria-label="Scroll right" 
                    onClick={scrollRight}
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* Add this to your global CSS for the scrollbar hiding */
/* 
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
*/
