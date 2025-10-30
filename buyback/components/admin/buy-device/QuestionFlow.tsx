"use client";

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Model, Question as CatalogQuestion, QuestionOption as CatalogQuestionOption, ItemTranslation, QuestionSetAssignment } from '@/types/catalog';
import { DeviceEstimationQuestion } from '@/types/shop';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { shopService } from '@/lib/api/catalog/shopService';

interface QuestionFlowProps {
  productSefUrl: string;
  shopId: number;
  onCompleted: (answers: Record<string, string>, estimatedPrice: number, product: Model) => void;
  onBack: () => void;
  locale: string;
}

// Map input types to question types
const mapInputType = (inputType: string): DeviceEstimationQuestion['type'] => {
  switch (inputType) {
    case 'SINGLE_SELECT_RADIO':
    case 'SINGLE_SELECT_DROPDOWN':
      return 'multiple-choice';
    case 'TEXT_INPUT':
      return 'text-input';
    case 'NUMBER_INPUT':
      return 'slider';
    default:
      return 'multiple-choice';
  }
};

// Helper interface for translation handling
interface ExtendedTranslation extends ItemTranslation {
  languageId?: number;
}

// Helper function to get translated content from catalog item translations
const getTranslatedTitle = (
  originalTitle: string, 
  translations: ItemTranslation[] | undefined, 
  locale: string
): string => {
  if (!translations || translations.length === 0) {
    return originalTitle;
  }
  
  if (locale === 'en') {
    return originalTitle;
  }
  
  const translation = translations.find((t) => {
    const extT = t as ExtendedTranslation;
    const tLanguageId = t.language_id || extT.languageId;
    return (
      t.language?.code === locale || 
      tLanguageId === parseInt(locale) ||
      t.language?.id === parseInt(locale)
    );
  });

  if (translation && translation.title) {
   
    return translation.title;
  }

  // Fallback to default language
  const defaultTranslation = translations.find(
    (t) => t.language?.is_default === true || t.language?.is_default === 1
  );

  if (defaultTranslation && defaultTranslation.title) {
   
    return defaultTranslation.title;
  }

 
  return originalTitle;
};

export function QuestionFlow({ productSefUrl, shopId, onCompleted, onBack, locale }: QuestionFlowProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Fetch product details with question sets
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product-details', shopId, productSefUrl],
    queryFn: async () => {
     
      const response = await shopService.getPublishedModelDetailsBySefUrl(shopId, productSefUrl);
     
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        questionSetAssignments: response.data?.questionSetAssignments,
        questionSetAssignmentsLength: response.data?.questionSetAssignments?.length,
      });
      return response.data;
    },
    enabled: !!shopId && !!productSefUrl,
  });

  // Process questions from the product's questionSetAssignments - same logic as DeviceEstimationPageClient
  const processedQuestions: DeviceEstimationQuestion[] = useMemo(() => {
    if (!product) {
     
      return [];
    }

   
    
    if (!product?.questionSetAssignments) {
     
      return [];
    }

   

    const allQuestions: CatalogQuestion[] = product.questionSetAssignments
      .sort((a: QuestionSetAssignment, b: QuestionSetAssignment) => a.assignmentOrder - b.assignmentOrder)
      .reduce((acc: CatalogQuestion[], qsa: QuestionSetAssignment) => {
        if (qsa?.questionSet?.questions) {
         
          return acc.concat(qsa.questionSet.questions.sort((qa: CatalogQuestion, qb: CatalogQuestion) => qa.orderNo - qb.orderNo));
        }
        return acc;
      }, [] as CatalogQuestion[]);
    
   
    
    return allQuestions.map((q: CatalogQuestion) => {
     
        id: q.id,
        key: q.key,
        title: q.title,
        translationsCount: q.translations?.length || 0,
        translations: q.translations
      });
      
      const translatedTitle = getTranslatedTitle(q.title, q.translations, locale);
     
      
      return {
        id: q.key || q.id.toString(),
        text: translatedTitle as string,
        type: mapInputType(q.inputType),
        options: q.options.map((opt: CatalogQuestionOption) => {
         
            id: opt.id,
            key: opt.key,
            title: opt.title,
            translationsCount: opt.translations?.length || 0,
            translations: opt.translations
          });
          
          const translatedOptionTitle = getTranslatedTitle(opt.title, opt.translations, locale);
         
          
          return {
            label: translatedOptionTitle as string,
            value: opt.key || opt.id.toString(),
          };
        }),
      };
    });
  }, [product, locale]);

  // Reset when product changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
  }, [product]);

  const handleAnswer = (questionId: string, selectedOptionValue: string) => {
    const newAnswers = { ...answers, [questionId]: selectedOptionValue };
    setAnswers(newAnswers);
    
    // Auto-advance to next question after answering
    if (currentQuestionIndex < processedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered, calculate price
      calculateEstimatedPrice(newAnswers);
    }
  };

  const calculateEstimatedPrice = (finalAnswers: Record<string, string>) => {
    if (!product) return;
    
    let totalModifier = 0;
    if (product.questionSetAssignments) {
      for (const qId in finalAnswers) {
        const answeredOptionValue = finalAnswers[qId];
        product.questionSetAssignments.forEach(qsa => {
          qsa.questionSet.questions.forEach(catalogQ => {
            if ((catalogQ.key || catalogQ.id.toString()) === qId) {
              const selectedOpt = catalogQ.options.find(opt => (opt.key || opt.id.toString()) === answeredOptionValue);
              if (selectedOpt) {
                totalModifier += selectedOpt.price_modifier;
              }
            }
          });
        });
      }
    }
    const estimatedPrice = (product.base_price || 0) + totalModifier;
   
    
    onCompleted(finalAnswers, estimatedPrice, product);
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < processedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Product Questions</h2>
            <p className="text-gray-600">Fetching product details and questions...</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading questions...</span>
        </div>
        
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Product Selection
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Product</h2>
            <p className="text-gray-600">Failed to load product details and questions.</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <AlertCircle className="w-8 h-8 text-red-600" />
          <span className="ml-3 text-red-600">Failed to load product information. Please try again.</span>
        </div>
        
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Product Selection
          </Button>
        </div>
      </div>
    );
  }

  // No product data
  if (!product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Not Found</h2>
            <p className="text-gray-600">Could not find product information.</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Product Selection
          </Button>
        </div>
      </div>
    );
  }

  // If no questions, proceed directly with base price
  if (processedQuestions.length === 0) {
    const basePrice = product.base_price || 0;
   
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Questions Required</h2>
            <p className="text-gray-600">
              This product doesn&apos;t require condition assessment questions.
            </p>
          </div>
        </div>

        {/* Product Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Selected Product</h3>
          <p className="text-gray-700">{product.title}</p>
          {product.base_price && (
            <p className="text-sm text-gray-600 mt-1">Base Price: €{product.base_price}</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            Since no questions are configured for this product, the estimated price will be the base price: €{basePrice}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Product Selection
          </Button>
          
          <Button onClick={() => onCompleted({}, basePrice, product)} className="px-6">
            Continue with Base Price
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = processedQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / processedQuestions.length) * 100;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Answer Questions</h2>
          <p className="text-gray-600">
            Answer questions about the device condition to determine the price.
          </p>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Selected Product</h3>
        <p className="text-gray-700">{product.title}</p>
        {product.base_price && (
          <p className="text-sm text-gray-600 mt-1">Base Price: €{product.base_price}</p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Question {currentQuestionIndex + 1} of {processedQuestions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Question Container - Similar to MinimalEstimationVariant */}
      <motion.div 
        className="bg-white rounded-lg shadow-lg border border-gray-200 p-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ minHeight: '400px' }}
      >
        {/* Question Text */}
        <div className="min-h-[80px] flex items-center justify-center w-full mb-6">
          <motion.h3 
            className="text-xl md:text-2xl font-medium text-center text-gray-900"
            variants={itemVariants}
          >
            {currentQuestionIndex + 1}. {currentQuestion.text as string}
          </motion.h3>
        </div>
        
        {/* Options */}
        {currentQuestion?.type === 'multiple-choice' && currentQuestion.options && (
          <motion.div 
            className="flex flex-wrap justify-center w-full min-h-[120px] mx-auto gap-3"
            variants={containerVariants}
          >
            {currentQuestion.options.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.value;
              
              return (
                                 <motion.button
                   key={option.value}
                   onClick={() => handleAnswer(currentQuestion.id, option.value)}
                   className="min-w-[120px] py-3 px-6 border bg-white rounded-md font-medium text-center relative overflow-hidden transition-all duration-200"
                   style={{
                     color: isSelected ? 'white' : '#374151',
                     backgroundColor: isSelected ? '#3b82f6' : 'white',
                     borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                   }}
                   whileHover={{ 
                     boxShadow: '0 0 0 2px #3b82f6',
                     borderColor: '#3b82f6',
                     scale: 1.02
                   }}
                   whileTap={{ scale: 0.98 }}
                   variants={itemVariants}
                 >
                   {option.label as string}
                 </motion.button>
              );
            })}
          </motion.div>
        )}
        
        {/* Navigation Buttons */}
        <motion.div
          className="flex justify-between mt-8 w-full"
          variants={containerVariants}
        >
          <Button
            variant="outline"
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
            className={`flex items-center gap-2 ${currentQuestionIndex === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <Button
            onClick={handleNextQuestion}
            disabled={!answers[currentQuestion?.id]}
            className={`flex items-center gap-2 ${!answers[currentQuestion?.id] ? 'opacity-40 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Product Selection
        </Button>
      </div>
    </div>
  );
} 