"use client";

import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { availableLanguagesAtom, shopConfigAtom, Language } from '@/store/atoms';
import { useFAQsByShopId } from '@/hooks/catalog/useFAQs';
import { getLocalizedText } from '@/utils/localization';
import { FAQ as CatalogFAQ } from '@/types/catalog';
import { TranslatableText } from '@/types/shop';
import { MainLayout } from '@/components/layout/MainLayout';
import { useParams } from 'next/navigation';

// Corrected ProcessedFAQ: it represents a processed FAQ, not a translation entry.
// It should have the FAQ's own ID, not necessarily faq_id from a translation record.
interface ProcessedFAQ {
  id: number; // FAQ ID from CatalogFAQ
  shop_id: number;
  is_published?: boolean;
  questionML: TranslatableText;
  answerML: TranslatableText;
  order_no?: number;
}

// Helper to transform FAQ item for localization
const transformFaqItem = (faqItem: CatalogFAQ, languages: Language[], defaultLocale: string = 'en'): ProcessedFAQ => {
  const questionML: TranslatableText = { [defaultLocale]: faqItem.question };
  const answerML: TranslatableText = { [defaultLocale]: faqItem.answer };

  faqItem.translations?.forEach(t => {
    const lang = languages.find(l => l.id === String(t.language_id));
    if (lang && lang.code) {
      questionML[lang.code] = t.question;
      answerML[lang.code] = t.answer;
    }
  });
  
  return {
    id: faqItem.id!, // id comes from the FAQ item itself
    shop_id: faqItem.shop_id,
    is_published: faqItem.is_published,
    order_no: faqItem.order_no,
    questionML,
    answerML,
  };
};

export default function FAQsClient() {
  const params = useParams();
  const currentLocale = params.locale as string || 'en';
  
  const shopConfig = useAtomValue(shopConfigAtom); // Get the main shop config for theme, etc.
  const availableLanguages = useAtomValue(availableLanguagesAtom);
  const fallbackLocale = availableLanguages.find(lang => lang.isDefault)?.code || 'en';

  // TODO: Determine the correct shopId for this page. Using shopConfig.shopId or a default.
  // This might come from a global context, URL, or be a fixed value if this is a single-shop site.
  const shopId = parseInt(shopConfig.shopId) || 1; // Example: using shopId from global config or defaulting to 1

  const [expandedFAQ, setExpandedFAQ] = useState<number[]>([]);

  const { 
    data: faqsApiResponse, 
    isLoading, 
    error 
  } = useFAQsByShopId(shopId, true); // Fetch all published FAQs for the shopId

  const processedFaqs = useMemo(() => {
    const rawFaqs = faqsApiResponse?.data;
    if (!Array.isArray(rawFaqs)) return [];
    return rawFaqs.map(faq => transformFaqItem(faq, availableLanguages, fallbackLocale))
                  .sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
  }, [faqsApiResponse, availableLanguages, fallbackLocale]);

  const pageTitle = shopConfig.faq?.title 
    ? getLocalizedText(shopConfig.faq.title, currentLocale, fallbackLocale) 
    : "Frequently Asked Questions";

  return (
    <MainLayout shopConfig={shopConfig}>
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-10 md:mb-14">
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: shopConfig.theme.primary }}>
            {pageTitle}
          </h1>
          {shopConfig.faq?.subtitle && (
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              {getLocalizedText(shopConfig.faq.subtitle, currentLocale, fallbackLocale)}
            </p>
          )}
        </div>

        {isLoading && (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading all questions...</p>
          </div>
        )}
        {error && (
          <div className="text-center py-10 text-red-600">
            <p className="text-lg">Could not load questions at this time. Please try again later.</p>
          </div>
        )}

        {!isLoading && !error && processedFaqs.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-600 text-lg">No frequently asked questions have been added yet.</p>
          </div>
        )}

        {!isLoading && !error && processedFaqs.length > 0 && (
          <div className="max-w-3xl mx-auto space-y-4">
            {processedFaqs.map((faq) => (
              <div 
                key={faq.id} 
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-white"
              >
                <button
                  className="w-full p-5 text-left font-semibold text-lg flex justify-between items-center hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 rounded-t-lg"
                  onClick={() => {
                    setExpandedFAQ(prevExpanded => 
                        prevExpanded.includes(faq.id) 
                            ? prevExpanded.filter(id => id !== faq.id) 
                            : [...prevExpanded, faq.id]
                    );
                  }}
                  aria-expanded={expandedFAQ.includes(faq.id)}
                  aria-controls={`faq-answer-all-${faq.id}`}
                >
                  <span className="flex-1 text-gray-800">
                    {getLocalizedText(faq.questionML, currentLocale, fallbackLocale)}
                  </span>
                  <span className={`transform transition-transform duration-200 ml-3 ${expandedFAQ.includes(faq.id) ? 'rotate-180' : 'rotate-0'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                
                <div 
                  id={`faq-answer-all-${faq.id}`}
                  className={`overflow-hidden transition-all duration-350 ease-in-out ${expandedFAQ.includes(faq.id) ? 'max-h-[1000px]' : 'max-h-0'}`}
                  style={{ transitionProperty: 'max-height, padding, opacity' }}
                >
                  <div className={`p-5 border-t border-gray-200 ${expandedFAQ.includes(faq.id) ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                      {getLocalizedText(faq.answerML, currentLocale, fallbackLocale)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
