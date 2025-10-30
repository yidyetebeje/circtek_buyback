"use client";

import { useAtom, useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import React, { useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  displayConfigAtom, 
  activeComponentAtom, 
  previewConfigAtom, 
  shopConfigAtom,
  currentDeviceEstimationQuestionIndexAtom,
  userDeviceAnswersAtom,
  estimatedDevicePriceAtom,
  estimationCartAtom,
  InProgressEstimation,
  currentLanguageObjectAtom
} from '@/store/atoms';
import { Header } from '@/components/layout/Header';
import { ConfigSidebar } from "@/components/config/ConfigSidebar";
import { ComponentEditor } from "@/components/config/ComponentEditor";
import { Model as CatalogModel, Question as CatalogQuestion, QuestionOption as CatalogQuestionOption, ItemTranslation } from '@/types/catalog';
import { Language } from '@/store/atoms';
import { DeviceEstimationQuestion, DeviceInformation, TranslatableText } from '@/types/shop';
import { DefaultEstimationVariant } from './variants/DefaultEstimationVariant';
import { ImageProminentEstimationVariant } from './variants/ImageProminentEstimationVariant';
import { MinimalEstimationVariant } from './variants/MinimalEstimationVariant';
import { useRouter } from 'next/navigation';

const mapInputType = (inputType: string): DeviceEstimationQuestion['type'] => {
  switch (inputType) {
    case 'SINGLE_SELECT_RADIO':
    case 'SINGLE_SELECT_DROPDOWN':
      return 'multiple-choice';
    default:
      return 'multiple-choice';
  }
};

const getLocalizedText = (textInput: TranslatableText | string | undefined, locale: string, defaultLocale: string): string => {
  if (typeof textInput === 'string') return textInput;
  if (textInput && typeof textInput === 'object') {
    return textInput[locale] || textInput[defaultLocale] || textInput.en || '';
  }
  return '';
};

// Helper interface for translation handling
interface ExtendedTranslation extends ItemTranslation {
  languageId?: number; // Backend might use this field name
}

// Helper function to get translated content from catalog item translations
const getTranslatedTitle = (
  originalTitle: string, 
  translations: ItemTranslation[] | undefined, 
  currentLanguage: Language | null
): string => {
  if (!currentLanguage || !translations || translations.length === 0) {
    return originalTitle;
  }
   if(currentLanguage.code === 'en'){
    return originalTitle;
   }
  const translation = translations.find((t) => {
    const extT = t as ExtendedTranslation;
    const tLanguageId = t.language_id || extT.languageId;
    return (
      t.language?.code === currentLanguage.code || 
      tLanguageId === parseInt(currentLanguage.id) ||
      t.language?.id === parseInt(currentLanguage.id)
    );
  });

  if (translation && translation.title) {
    console.log('Found translation:', translation.title);
    return translation.title;
  }

  // Fallback to default language
  const defaultTranslation = translations.find(
    (t) => t.language?.is_default === true || t.language?.is_default === 1
  );

  if (defaultTranslation && defaultTranslation.title) {
    console.log('Using default translation:', defaultTranslation.title);
    return defaultTranslation.title;
  }

  console.log('No translation found, using original:', originalTitle);
  return originalTitle;
};

interface DeviceEstimationPageClientProps {
  deviceModel: CatalogModel;
  currentLocale?: string;
  defaultLocale?: string;
}

export function DeviceEstimationPageClient({
  deviceModel,
  currentLocale = 'en',
  defaultLocale = 'en',
}: DeviceEstimationPageClientProps) {
  const displayConfig = useAtomValue(displayConfigAtom);
  const activeComponent = useAtomValue(activeComponentAtom);
  const [, setActiveComponentSetter] = useAtom(activeComponentAtom);
  const previewConfValue = useAtomValue(previewConfigAtom);
  const [, setPreviewConfigSetter] = useAtom(previewConfigAtom);
  const [, setShopConfigSetter] = useAtom(shopConfigAtom);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [currentQuestionIndex, setCurrentQuestionIndex] = useAtom(currentDeviceEstimationQuestionIndexAtom);
  const [answers, setAnswers] = useAtom(userDeviceAnswersAtom);
  const [estimatedPrice, setEstimatedPrice] = useAtom(estimatedDevicePriceAtom);
  const [, setEstimationCart] = useAtom(estimationCartAtom);
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);

  const processedQuestions: DeviceEstimationQuestion[] = useMemo(() => {
    console.log('Processing questions, deviceModel:', deviceModel);
    
    if (!deviceModel?.questionSetAssignments) {
      console.log('No questionSetAssignments found');
      return [];
    }

    console.log('questionSetAssignments:', deviceModel.questionSetAssignments);

    const allQuestions: CatalogQuestion[] = deviceModel.questionSetAssignments
      .sort((a, b) => a.assignmentOrder - b.assignmentOrder)
      .reduce((acc, qsa) => {
        if (qsa?.questionSet?.questions) {
          console.log('Adding questions from questionSet:', qsa.questionSet.id, 'questions:', qsa.questionSet.questions.length);
          return acc.concat(qsa.questionSet.questions.sort((qa, qb) => qa.orderNo - qb.orderNo));
        }
        return acc;
      }, [] as CatalogQuestion[]);
    
    console.log('All questions collected:', allQuestions.length);
    
    return allQuestions.map((q: CatalogQuestion) => {
      console.log('Processing question:', {
        id: q.id,
        key: q.key,
        title: q.title,
        translationsCount: q.translations?.length || 0,
        translations: q.translations,
        currentLanguage
      });
      
      const translatedTitle = getTranslatedTitle(q.title, q.translations, currentLanguage);
      console.log('Translated title:', translatedTitle);
      
      return {
        id: q.key || q.id.toString(),
        text: translatedTitle,
        type: mapInputType(q.inputType),
        options: q.options.map((opt: CatalogQuestionOption) => {
          console.log('Processing option:', {
            id: opt.id,
            key: opt.key,
            title: opt.title,
            translationsCount: opt.translations?.length || 0,
            translations: opt.translations
          });
          
          const translatedOptionTitle = getTranslatedTitle(opt.title, opt.translations, currentLanguage);
          console.log('Translated option title:', translatedOptionTitle);
          
          return {
            label: translatedOptionTitle,
            value: opt.key || opt.id.toString(),
          };
        }),
      };
    });
  }, [deviceModel, currentLanguage]);

  useEffect(() => {
    // Always reset the active questionnaire state when the device context changes or on initial load for this device.
    console.log('Resetting questionnaire state for device:', deviceModel?.sef_url);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setEstimatedPrice(null); // Reset the price as well, it will be recalculated as user answers.

    // If there are no questions for this device (e.g., direct sale model), 
    // set the estimate to the base price immediately.
    if (deviceModel && processedQuestions && processedQuestions.length === 0) {
      const basePrice = deviceModel.base_price || 0;
      setEstimatedPrice(basePrice);
      console.log('No questions for this device. Estimate is base price:', basePrice);
    }
    // This effect should run when the deviceModel changes or when processedQuestions are re-evaluated (e.g. language change).
  }, [deviceModel, processedQuestions, setCurrentQuestionIndex, setAnswers, setEstimatedPrice]);

  const questions = processedQuestions;
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex) / totalQuestions) * 100 : (estimatedPrice !== null ? 100 : 0);

  const handleAnswer = (questionId: string, selectedOptionValue: string) => {
    const currentAnswers = { ...answers, [questionId]: selectedOptionValue };
    setAnswers(currentAnswers);

    let finalPrice = null;
    let newQuestionIndex = currentQuestionIndex;

    if (currentQuestionIndex < totalQuestions - 1) {
      newQuestionIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newQuestionIndex);
    } else {
      let totalModifier = 0;
      if (deviceModel.questionSetAssignments) {
         for (const qId in currentAnswers) {
          const answeredOptionValue = currentAnswers[qId];
          deviceModel.questionSetAssignments.forEach(qsa => {
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
      finalPrice = (deviceModel.base_price || 0) + totalModifier;
      setEstimatedPrice(finalPrice);
      console.log(`All questions answered. Base Price: ${deviceModel.base_price}, Modifier: ${totalModifier}, Final Price: ${finalPrice}`);
    }
  };
  
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculate final price when reaching the last question
      let totalModifier = 0;
      if (deviceModel.questionSetAssignments) {
        for (const qId in answers) {
          const answeredOptionValue = answers[qId];
          deviceModel.questionSetAssignments.forEach(qsa => {
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
      const finalPrice = (deviceModel.base_price || 0) + totalModifier;
      setEstimatedPrice(finalPrice);
    }
  };
  
  const handleCheckout = () => {
    console.log('Checkout initiated with price:', estimatedPrice, 'Answers:', answers, 'Device ID:', deviceModel.sef_url);

    if (!deviceModel || !deviceModel.sef_url) {
      console.error("Cannot add to cart: deviceModel or sef_url is missing.");
      return;
    }
    
    let priceForCart = estimatedPrice;
    if (questions.length === 0 && deviceModel.base_price && priceForCart === null) {
      priceForCart = deviceModel.base_price;
    }

    const cartItem: InProgressEstimation = {
      deviceId: deviceModel.sef_url,
      deviceModel: deviceModel,
      answers: answers,
      currentQuestionIndex: currentQuestionIndex,
      estimatedPrice: priceForCart,
      lastUpdatedAt: Date.now(),
    };

    setEstimationCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.deviceId === cartItem.deviceId);
      if (existingItemIndex !== -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex] = cartItem;
        console.log('Updated item in cart:', cartItem);
        return newCart;
      } else {
        console.log('Added new item to cart:', cartItem);
        return [...prevCart, cartItem];
      }
    });

    router.push(`/${currentLocale}/sell/${deviceModel.sef_url}/checkout`);
  };

  const handleEditSection = () => { 
    setPreviewConfigSetter(null);
    setActiveComponentSetter('deviceEstimation');
    console.log('Editing Device Estimation section in ComponentEditor');
  };
  
  const handleCloseEditor = () => {
    if (previewConfValue) {
      setShopConfigSetter(prev => ({
        ...prev,
      })); 
    }
    setPreviewConfigSetter(null);
    setActiveComponentSetter(null);
  };

  const variantInitialDevice: DeviceInformation = useMemo(() => ({
    id: deviceModel.sef_url || deviceModel.id?.toString() || '',
    name: getLocalizedText(deviceModel.title, currentLocale, defaultLocale),
    imageUrl: deviceModel.model_image || '',
    description: getLocalizedText(deviceModel.description || undefined, currentLocale, defaultLocale),
    categoryName: getLocalizedText(deviceModel.category?.title, currentLocale, defaultLocale),
    brandName: getLocalizedText(deviceModel.brand?.title, currentLocale, defaultLocale),
  }), [deviceModel, currentLocale, defaultLocale]);

  const renderVariant = () => {
    const variant = displayConfig.deviceEstimationConfig?.variant || 'default';
    const props = {
      initialDevice: variantInitialDevice,
      questions: processedQuestions,
      answers,
      currentQuestionIndex,
      totalQuestions,
      estimatedPrice,
      progress,
      theme: displayConfig.theme,
      shopName: displayConfig.shopName,
      estimationResultTitle: displayConfig.deviceEstimationConfig?.estimationResultTitle,
      checkoutButtonText: displayConfig.deviceEstimationConfig?.checkoutButtonText,
      currentLocale,
      defaultLocale,
      handleAnswer,
      handleCheckout,
      handlePrevQuestion,
      handleNextQuestion,
    };
    console.log("current questions",processedQuestions)

    switch (variant) {
      case 'image-prominent':
        return <ImageProminentEstimationVariant {...props} />;
      case 'default':
        return <DefaultEstimationVariant {...props} />;
      case 'minimal':
        return <MinimalEstimationVariant {...props} />;
      default:
        return <MinimalEstimationVariant {...props} />;
    }
  };

  if (!deviceModel) {
    return <div>Loading device information...</div>; 
  }

  return (
    <div style={{ backgroundColor: displayConfig.theme.background }} className="flex flex-col min-h-screen overflow-hidden justify-start w-full">
      <Header shopConfig={displayConfig} />

      <div className="w-full md:h-[calc(100vh-80px)] h-auto relative flex flex-col justify-start items-center mt-10 pb-24">
        <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8">
          {renderVariant()}
        </div>

        {isAuthenticated && (
          <motion.button 
            onClick={handleEditSection}
            className="fixed bottom-6 right-6 md:right-20 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-white text-gray-600"
            title="Edit Estimation Page Settings"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 17, 
              delay: 0.8 
            }}
            whileHover={{ 
              scale: 1.1, 
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)", 
              backgroundColor: displayConfig.theme.primary, 
              color: "white"
            }}
            whileTap={{ scale: 0.9 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
            </svg>
          </motion.button>
        )}
      </div>

      {isAuthenticated && <ConfigSidebar />}
      {isAuthenticated && (
        <ComponentEditor
          isOpen={activeComponent === 'deviceEstimation'}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
} 