"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useAtomValue } from "jotai";
import { useTranslations, useLocale } from 'next-intl';
import { ShopConfig, TranslatableText } from "@/types/shop";
import { FAQ as CatalogFAQ } from "@/types/catalog";
import { useFAQsByShopId } from "@/hooks/catalog/useFAQs";
import { currentLanguageObjectAtom, availableLanguagesAtom, Language } from "@/store/atoms";
import { getLocalizedText } from "@/utils/localization";

interface FAQSectionProps {
  shopConfig: ShopConfig;
  shopId: number;
}

interface ProcessedFAQ {
  id: number; // Made id non-optional here, will filter out items without id
  shop_id: number;
  is_published?: boolean;
  questionML: TranslatableText;
  answerML: TranslatableText;
  order_no?: number;
}

const transformFaqItem = (faqItem: CatalogFAQ, languages: Language[], defaultLocale: string = 'en'): ProcessedFAQ | null => {
  if (typeof faqItem.id !== 'number') {
    console.warn('FAQ item without a valid ID received:', faqItem);
    return null; // Skip items without a valid ID
  }
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
    id: faqItem.id, // Now id is guaranteed to be a number
    shop_id: faqItem.shop_id,
    is_published: faqItem.is_published,
    order_no: faqItem.order_no,
    questionML,
    answerML,
  };
};

export function FAQSection({ shopConfig, shopId }: FAQSectionProps) {
  const t = useTranslations('FAQSection');
 
  const nextIntlLocale = useLocale();

  const [expandedFAQ, setExpandedFAQ] = useState<number[]>([]);
  const currentLanguageState = useAtomValue(currentLanguageObjectAtom);
  const availableLanguages = useAtomValue(availableLanguagesAtom);
  
  const currentLocale = currentLanguageState?.code || 'en';
  const fallbackLocale = availableLanguages.find(lang => lang.isDefault)?.code || 'en';

  const { 
    data: faqsApiResponse,
    isLoading, 
    error 
  } = useFAQsByShopId(shopId, true);

  const faqComponentConfig = shopConfig.faq;
  const showFAQ = faqComponentConfig?.showFAQ !== false; // Show if not explicitly false or if faqConfig is undefined

  // Determine title and subtitle
  const titleToDisplay =  t('defaultTitle');
 

  const subtitleToDisplay = t('defaultSubtitle'); // Show default only if subtitle field itself is not present in config

  const processedFaqs = useMemo(() => {
    const rawFaqs = faqsApiResponse?.data;
    if (!Array.isArray(rawFaqs)) return [];
    return rawFaqs
      .map(faq => transformFaqItem(faq, availableLanguages, fallbackLocale))
      .filter((faq): faq is ProcessedFAQ => faq !== null) // Type guard to filter out nulls and ensure ProcessedFAQ type
      .sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
  }, [faqsApiResponse, availableLanguages, fallbackLocale]);

  if (!showFAQ || (!isLoading && !error && processedFaqs.length === 0)) {
    return null;
  }

  const faqsToShow = processedFaqs.slice(0, 3);
  const hasMoreFaqs = processedFaqs.length > 3;

  return (
    <div id="faq" className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3" style={{ color: shopConfig.theme.primary }}>
            {titleToDisplay}
          </h2>
          {subtitleToDisplay && (
            <p className="text-gray-600 max-w-3xl mx-auto">
              {subtitleToDisplay}
            </p>
          )}
        </div>
        
        {isLoading && (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('loadingText')}</p>
          </div>
        )}
        {error && (
          <div className="text-center py-10 text-red-600">
            <p>{t('errorText')}</p>
          </div>
        )}

        {!isLoading && !error && processedFaqs.length > 0 && (
          <div className="max-w-3xl mx-auto">
            {faqsToShow.map((faq) => (
              <div 
                key={faq.id} 
                className="mb-4 border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <button
                  className="w-full p-4 text-left font-medium flex justify-between items-center bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 rounded-t-lg"
                  onClick={() => {
                    setExpandedFAQ(prevExpanded => 
                        prevExpanded.includes(faq.id) 
                            ? prevExpanded.filter(id => id !== faq.id) 
                            : [...prevExpanded, faq.id]
                    );
                  }}
                  aria-expanded={expandedFAQ.includes(faq.id)}
                  aria-controls={`faq-answer-${faq.id}`}
                >
                  <span className="flex-1 text-gray-800">
                    {getLocalizedText(faq.questionML, currentLocale, fallbackLocale)}
                  </span>
                  <span className={`transform transition-transform duration-200 ml-2 ${expandedFAQ.includes(faq.id) ? 'rotate-180' : 'rotate-0'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                
                <div 
                  id={`faq-answer-${faq.id}`}
                  className={`overflow-hidden transition-all duration-300 ease-in-out bg-white ${expandedFAQ.includes(faq.id) ? 'max-h-[500px]' : 'max-h-0'}`}
                >
                  <div className="p-4 border-t border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {getLocalizedText(faq.answerML, currentLocale, fallbackLocale)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {hasMoreFaqs && (
              <div className="mt-8 text-center">
                <Link 
                href={`/${currentLocale}/faqs`}
                className="inline-block px-8 py-3 text-base font-medium text-white rounded-md transition-colors duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                style={{ backgroundColor: shopConfig.theme.primary }}
              >
                {t('viewAllButton')}
              </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
