import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { CategoryVariantProps } from './index';
import { currentLanguageObjectAtom } from '@/store/atoms';
import { getTranslatedCategoryContent } from '@/utils/categoryTranslationUtils';
import { useCategoryText } from '@/utils/categoryTextUtils';

export function MinimalistCategory({ categories, primaryColor, title, subtitle, categoryTextConfig }: CategoryVariantProps) {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  const { getCategoryText } = useCategoryText(categoryTextConfig, currentLanguage?.code || 'en');
  
  return (
    <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden bg-white">
      {/* Subtle background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] sm:[background-size:20px_20px] opacity-40"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-xl mx-auto text-center mb-10 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">{title || getCategoryText('browseCategories')}</h2>
          <p className="text-sm sm:text-base text-gray-600">{subtitle || getCategoryText('chooseFromSelection')}</p>
          <div className="w-12 md:w-16 h-1 mx-auto mt-4 md:mt-6 rounded" style={{ backgroundColor: primaryColor }}></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
          {categories.map((category) => {
            // Get translated content for current language
            const translatedContent = getTranslatedCategoryContent(category, currentLanguage);
            const displayName = translatedContent.title;
            
            let buttonText = getCategoryText('sellDevice', displayName);
            if (displayName.toLowerCase().includes('tablet')) {
              buttonText = getCategoryText('sellTablets');
            } else if (displayName.toLowerCase().includes('phone')) {
              buttonText = getCategoryText('sellPhones');
            }

            return (
              <Link
                key={category.id}
                href={category.link || `/category/${category.id}/models`}
                className="group flex flex-col items-center text-center p-4 md:p-6 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 min-h-[180px] sm:min-h-[200px]"
                style={{
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}
              >
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full mb-3 md:mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${primaryColor}10` }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    className="sm:w-6 sm:h-6"
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ color: primaryColor }}
                    aria-hidden="true"
                  >
                    {/* Use different icons based on category name or ID if possible */}
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                  </svg>
                </div>
                
                <h3 className="font-medium text-base sm:text-lg mb-2 group-hover:text-[color:var(--color-primary)] transition-colors duration-300 line-clamp-2">
                  {displayName}
                </h3>
                
                {/* Description removed as part of variant updates */}
                
                <span 
                  className="inline-flex items-center text-xs font-medium px-3 py-1 rounded-full transition-all duration-300 group-hover:translate-y-1 group-hover:shadow-md mt-auto"
                  style={{ color: primaryColor, backgroundColor: `${primaryColor}1A` }}
                >
                  <span className="text-xs">{buttonText}</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-3 w-3 ml-1 transform group-hover:translate-x-1 transition-transform duration-300" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M7 17l9-9"/>
                    <path d="M7 8h9v9"/>
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
