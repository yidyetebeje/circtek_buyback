import Image from 'next/image';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { CategoryVariantProps } from './index';
import { currentLanguageObjectAtom } from '@/store/atoms';
import { getTranslatedCategoryContent } from '@/utils/categoryTranslationUtils';
import { useCategoryText } from '@/utils/categoryTextUtils';

export function DefaultCategory({ categories, primaryColor, title, subtitle, categoryTextConfig }: CategoryVariantProps) {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  const { getCategoryText } = useCategoryText(categoryTextConfig, currentLanguage?.code || 'en');
  
  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl font-bold mb-4" style={{ color: primaryColor }}>
                {title}
              </h2>
            )}
            {subtitle && <p className="text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-6">
          {categories.map((category) => {
            // Get translated content for current language
            const translatedContent = getTranslatedCategoryContent(category, currentLanguage || { code: 'en', name: 'English' });
            const displayName = translatedContent.title;
            
            // Only render if we have at least an id and a name to display
            if (!category.id || !displayName) return null;
            
            // Define default link if none is provided
            const categoryLink = category.link || `/category/${category.id}/models`;
            
            return (
              <Link 
                href={categoryLink} 
                key={category.id} 
                className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={`${displayName} category image - sell your ${displayName} devices`}
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <span className="text-gray-400">No image available</span>
                    </div>
                  )}
                  <div 
                    className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80"
                    aria-hidden="true"
                  ></div>
                </div>

                <div className="p-6 relative">
                  <h3 
                    className="text-xl font-semibold mb-2"
                    style={{ color: primaryColor }}
                  >
                    {displayName}
                  </h3>
                  
                  {/* Description removed as per design update */}
                  
                  <div 
                    className="mt-4 inline-flex items-center font-medium"
                    style={{ color: primaryColor }}
                  >
                    {getCategoryText('viewDevices')}
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 ml-1" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 5l7 7-7 7" 
                      />
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
