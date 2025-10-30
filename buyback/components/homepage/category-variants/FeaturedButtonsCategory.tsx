import Image from 'next/image';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { CategoryVariantProps } from './index';
import { currentLanguageObjectAtom } from '@/store/atoms';
import { getTranslatedCategoryContent } from '@/utils/categoryTranslationUtils';
import { useCategoryText } from '@/utils/categoryTextUtils';

export function FeaturedButtonsCategory({ categories, primaryColor, title, subtitle, categoryTextConfig }: CategoryVariantProps) {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  const { getCategoryText } = useCategoryText(categoryTextConfig, currentLanguage?.code || 'en');
 
  return (
    <section className="py-16 bg-white relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3" style={{ color: primaryColor }}>
            {title || getCategoryText('turnInSellMoney')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {subtitle || getCategoryText('chooseWideRange')}
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
          {categories.map((category) => {
            // Get translated content for current language
            const translatedContent = getTranslatedCategoryContent(category, currentLanguage || { code: 'en', name: 'English' });
           
            const displayName = translatedContent.title;
            
            return (
              <div key={category.id} className="flex flex-col items-center gap-4">
                <Link href={category.link || `/category/${category.id}/models`} className="relative w-full  flex items-center justify-center">
                  {category.imageUrl ? (
                    <div className="relative w-36 h-36">
                      <Image
                        src={category.imageUrl}
                        alt={`${displayName} category image`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center bg-gray-100 rounded-lg">
                      <span className="text-gray-400">No image available</span>
                    </div>
                  )}
                </Link>
                
                <Link
                  href={category.link || `/category/${category.id}/models`}
                  className="w-52 py-3 px-6 font-medium text-center rounded transition-transform hover:scale-105"
                  style={{ 
                    backgroundColor: primaryColor, 
                    color: '#fff'
                  }}
                >
                  {getCategoryText('sellDevice', displayName)}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
} 