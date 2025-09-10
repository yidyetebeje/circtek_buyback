'use client';

import React, { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Pencil, Trash2, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { estimationCartAtom, InProgressEstimation, displayConfigAtom } from '@/store/atoms';
import { MainLayout } from '@/components/layout/MainLayout';
import { getLocalizedText, getDynamicText } from '@/utils/localization';

interface CartPageClientProps {
  currentLocale: string;
}

export default function CartPageClient({ currentLocale }: CartPageClientProps) {
  const [estimationCart, setEstimationCart] = useAtom(estimationCartAtom);
  const router = useRouter();
  const t = useTranslations('Cart');
  const displayConfig = useAtomValue(displayConfigAtom);
  const primaryColor = displayConfig?.theme?.primary || '#10b981';
  const fallbackLocale = 'en'; // Fallback locale

  // Use the imported getLocalizedText utility

  // Calculate total estimated price
  const totalEstimatedPrice = useMemo(() => {
    return estimationCart.reduce((total, item) => total + (item.estimatedPrice || 0), 0);
  }, [estimationCart]);

  // Define interface for the question-answer pairs
  interface QuestionAnswer {
    question: string;
    answer: string;
    originalKey?: string;
  }

  // This function gets the full text for each question and answer
  const getAnsweredQuestionsListForItem = (item: InProgressEstimation): QuestionAnswer[] => {
    if (!item?.answers) return [];
    
    const answeredQuestions: QuestionAnswer[] = [];
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const questions: any[] = [];
    
    if (item.deviceModel?.questionSetAssignments) {
      for (const assignment of item.deviceModel.questionSetAssignments) {
        if (assignment.questionSet?.questions) {
          questions.push(...assignment.questionSet.questions);
        }
      }
    }
    
    // Sort questions if they have orderNo property
    const sortedQuestions = questions.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0));
    
    // Now match the answers to the questions
    Object.entries(item.answers).forEach(([questionKey, answerValue]) => {
      // Try to determine if questionKey is an index or an actual key
      const isNumericKey = !isNaN(Number(questionKey));
      const questionIndex = isNumericKey ? Number(questionKey) - 1 : null;
      
      // Try to find the question either by index or by key
      let question = null;
      if (questionIndex !== null && questionIndex >= 0 && questionIndex < sortedQuestions.length) {
        question = sortedQuestions[questionIndex];
      } else {
        question = sortedQuestions.find(q => q.key === questionKey || String(q.id) === questionKey);
      }
      
      let questionText = questionKey; // Default fallback
      let answerText = String(answerValue); // Default fallback
      
      if (question) {
        // Get the question text
        questionText = getDynamicText(
          question.title,
          question.translations,
          currentLocale,
          fallbackLocale
        );
        
        // Try to find the matching option
        const option = question.options?.find((opt: any) => 
          opt.key === answerValue || String(opt.id) === answerValue
        );
        
        if (option) {
          // Get the answer text
          answerText = getDynamicText(
            option.title,
            option.translations,
            currentLocale,
            fallbackLocale
          );
        }
      }
      
      // Only use default formatting if we couldn't find real text
      if (questionText === questionKey) {
        questionText = questionKey.replace(/_/g, ' ').replace(/^(\d+)$/, 'Question $1');
      }
      
      // Store with original key for debugging
      answeredQuestions.push({ 
        question: questionText, 
        answer: answerText,
        originalKey: questionKey 
      });
    });
    
    // Sort the answered questions by their original question index if possible
    const sortedAnswers = [...answeredQuestions].sort((a, b) => {
      // Try to sort by original keys if they're numeric
      if (a.originalKey && b.originalKey) {
        const indexA = parseInt(a.originalKey);
        const indexB = parseInt(b.originalKey);
        if (!isNaN(indexA) && !isNaN(indexB)) {
          return indexA - indexB;
        }
      }
      // Fall back to sorting by question text if they appear to be numeric
      const indexA = parseInt(a.question.replace(/^Question (\d+)$/, '$1'));
      const indexB = parseInt(b.question.replace(/^Question (\d+)$/, '$1'));
      if (!isNaN(indexA) && !isNaN(indexB)) {
        return indexA - indexB;
      }
      return 0;
    });
    
    return sortedAnswers;
  };

  const handleEditItem = (deviceId: string) => {
    router.push(`/${currentLocale}/sell/${deviceId}/estimate`);
  };

  const handleRemoveItem = (deviceId: string) => {
    setEstimationCart(prevCart => prevCart.filter(item => item.deviceId !== deviceId));
  };

  const handleProceedToCheckout = () => {
    router.push(`/${currentLocale}/sell/checkout`);
  };

  if (estimationCart.length === 0) {
    return (
      <MainLayout shopConfig={displayConfig}>
        <div className="flex flex-col min-h-[70vh] items-center justify-center p-4 w-full">
          <div className="bg-white p-10 rounded-xl shadow-lg text-center max-w-md w-full mx-auto">
            <div className="flex justify-center mb-4">
              <ShoppingCart size={48} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">{t('emptyCart.title') || 'Your Cart is Empty'}</h2>
            <p className="text-gray-600 mb-8">{t('emptyCart.description') || 'You have no items in your cart. Start by adding some devices for buyback.'}</p>
            <a 
              href={`/${currentLocale}`}
              className="px-6 py-3 text-white font-semibold rounded-md hover:bg-opacity-90 transition-colors duration-150 text-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {t('emptyCart.browseDevices') || 'Browse Devices'}
            </a>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout shopConfig={displayConfig}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center" data-component-name="CartPageClient">
        <h1 className="text-2xl font-semibold mb-6 text-gray-700 text-center w-full" data-component-name="CartPageClient">{t('title') || 'Your Cart'}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-10 w-full max-w-5xl">
          <div className="md:col-span-2 lg:col-span-3">
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6" data-component-name="CartPageClient">
              <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b border-gray-300 pb-3" data-component-name="CartPageClient">{t('sections.cartItems') || 'CART ITEMS'}</h2>
              
              {estimationCart.map((item) => {
                const deviceModel = item.deviceModel;
                const deviceName = getLocalizedText(deviceModel.title, currentLocale, fallbackLocale);
                const deviceImageUrl = deviceModel.model_image || '/placeholder-image.png';
                const specifications = deviceModel.specifications;
                const storage = specifications && typeof specifications.storage === 'string' ? specifications.storage : 'N/A';
                const answeredQuestions = getAnsweredQuestionsListForItem(item);

                return (
                  <div key={item.deviceId} className="mb-4 border border-gray-200 rounded-md p-4" data-component-name="CartPageClient">
                    <div className="flex items-start" data-component-name="CartPageClient">
                      <img src={deviceImageUrl} alt={deviceName} className="w-16 h-auto object-contain rounded-md mr-3 mt-1"/>
                      <div className="flex-grow">
                        <h3 className="text-base font-medium text-gray-900 mb-0.5" data-component-name="CartPageClient">{deviceName}</h3>
                        <p className="text-xs text-gray-500" data-component-name="CartPageClient">
                          {deviceModel.brand ? getLocalizedText(deviceModel.brand.title, currentLocale, fallbackLocale) : ''}
                          {storage !== 'N/A' ? ` | ${storage}` : ''}
                        </p>
                        <p className="text-sm font-semibold mt-1" style={{ color: primaryColor }}>
                          € {item.estimatedPrice?.toFixed(2) ?? '0.00'}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-1 items-end ml-2">
                        <button 
                          onClick={() => handleEditItem(item.deviceId)} 
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title={t('buttons.editItem') || 'Edit item'}
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleRemoveItem(item.deviceId)} 
                          className="p-1 text-gray-400 hover:text-red-600"
                          title={t('buttons.removeItem') || 'Remove item'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {answeredQuestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100" data-component-name="CartPageClient">
                        <h4 className="text-xs font-medium text-gray-600 mb-1.5" data-component-name="CartPageClient">{t('summary.condition') || 'Condition'}:</h4>
                        <ul className="space-y-0.5" data-component-name="CartPageClient">
                          {answeredQuestions.map((qa, index) => {
                            // Skip entries where both question and answer are just numbers
                            const isJustNumbers = !isNaN(Number(qa.question)) && !isNaN(Number(qa.answer));
                            // Skip numeric-only entries, but keep entries that start with 'Question'
                            const isFormattedQuestion = qa.question.startsWith('Question ');
                            // Don't skip if either contains non-numeric content or is a formatted question
                            const shouldShow = isFormattedQuestion || !isJustNumbers || 
                              qa.question.trim() !== String(Number(qa.question)) || 
                              qa.answer.trim() !== String(Number(qa.answer));
                            
                            if (!shouldShow) return null;
                            
                            return (
                              <li key={index} className="text-xs text-gray-500" data-component-name="CartPageClient">
                                <span className="font-medium text-gray-700">{qa.question}:</span> {qa.answer}
                              </li>
                            );
                          }).filter(Boolean)}
                          {answeredQuestions.length === 0 && (
                            <li className="text-xs text-gray-500" data-component-name="CartPageClient">
                              {t('summary.noConditionInfo') || 'No condition information available.'}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-sm sticky top-8">
              <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b border-gray-300 pb-3">{t('sections.orderSummary') || 'ORDER SUMMARY'}</h2>
              
              <div className="mt-6 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">{t('summary.subtotal') || 'Subtotal'}</span>
                  <span className="text-sm font-medium text-gray-800">€ {totalEstimatedPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">{t('summary.shipping') || 'Shipping'}</span>
                  <span className="text-sm font-medium text-gray-800">{t('summary.free') || 'Free'}</span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                  <span className="text-base font-semibold text-gray-800">{t('summary.total') || 'Total'}</span>
                  <span className="text-lg font-bold" style={{color: primaryColor}}>€ {totalEstimatedPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  style={{ backgroundColor: primaryColor }}
                  data-component-name="CartPageClient"
                >
                  {t('buttons.proceedToCheckout') || 'Proceed to Checkout'}
                </button>
                
                <a 
                  href={`/${currentLocale}`}
                  className="w-full mt-3 flex justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {t('buttons.continueShopping') || 'Continue Shopping'}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
