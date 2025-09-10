import Image from 'next/image';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { CategoryVariantProps } from './index';
import { currentLanguageObjectAtom } from '@/store/atoms';
import { getTranslatedCategoryContent } from '@/utils/categoryTranslationUtils';
import { useCategoryText } from '@/utils/categoryTextUtils';

export function GridCategory({ categories, primaryColor, title, subtitle, categoryTextConfig }: CategoryVariantProps) {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  const { getCategoryText } = useCategoryText(categoryTextConfig, currentLanguage?.code || 'en');
  
  return (
    <section className="py-16 bg-gray-50 relative">
      {/* Decorative patterns */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 z-0"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-12 max-w-3xl mx-auto text-center">
          <span 
            className="inline-block mb-3 px-4 py-1 text-xs font-semibold uppercase tracking-wider rounded-md"
            style={{ 
              color: primaryColor,
              backgroundColor: `${primaryColor}10` 
            }}
          >
            {title || getCategoryText('browseCategories')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title || getCategoryText('discoverDeviceValue')}</h2>
          <p className="text-gray-600">{subtitle || getCategoryText('selectDeviceCategory')}</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-5">
          {categories.map((category) => {
            // Get translated content for current language
            const translatedContent = getTranslatedCategoryContent(category, currentLanguage || { code: 'en', name: 'English' });
            const displayName = translatedContent.title;
            
            return (
              <Link
                key={category.id}
                href={category.link || `/category/${category.id}`}
                className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                <div className="aspect-square relative bg-gray-100">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={`${displayName} category image`}
                      fill
                      className="object-contain object-center group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <span className="text-gray-400">No image available</span>
                    </div>
                  )}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                  >
                    <div
                      className="absolute bottom-4 left-0 right-0 p-4 text-white text-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                    >
                      <span className="inline-block text-sm font-medium">{getCategoryText('viewAllModels')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <div 
                      className="w-8 h-8 flex items-center justify-center rounded-full"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{ color: primaryColor }}
                        aria-hidden="true"
                      >
                        <path d="M9 17H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"></path>
                        <rect x="7" y="9" width="10" height="10" rx="2" ry="2"></rect>
                      </svg>
                    </div>
                    <h3 className="font-medium text-lg">{displayName}</h3>
                  </div>
                  
                  <div 
                    className="inline-flex items-center justify-center px-4 py-2 mt-2 rounded-md font-medium text-sm transition-all duration-300 group-hover:shadow-md"
                    style={{ 
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor
                    }}
                  >
                    {getCategoryText('sellDevice', displayName)}
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="ml-2"
                      aria-hidden="true"
                    >
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
