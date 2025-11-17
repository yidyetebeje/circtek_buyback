/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useMemo, useEffect } from 'react';
import { useAtom } from 'jotai';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { isValidIBAN } from 'ibantools';
import { PhoneInput } from '@/components/ui/phone-input';
import { Pencil, Trash2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { estimationCartAtom, InProgressEstimation } from '@/store/atoms';
import { TranslatableText } from '@/types/shop';
import { CheckoutVariantProps } from './index';
import { useCreateOrder } from '@/hooks/useOrders';
import { CreateOrderPayload } from '@/lib/api/orderService';
import type { CreateOrderResponseData } from '@/lib/api/orderService';
import { countries } from '@/utils/countries';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import type { CountryCode } from 'libphonenumber-js';

export function DefaultCheckout({
  currentLocale,
  defaultLocale,
  primaryColor,
  backgroundColor = '#f9fafb',
  deviceId
}: CheckoutVariantProps) {
  const [estimationCart, setEstimationCart] = useAtom(estimationCartAtom);
  const router = useRouter();
  const createOrderMutation = useCreateOrder();
  const t = useTranslations('Checkout');

  // Updated Zod Schema for Checkout Form Validation including enhanced address validation
  const checkoutFormSchema = z.object({
    email: z.string().trim().email({ message: t('validation.emailInvalid') }).min(1, { message: t('validation.emailRequired') }),
    phoneNumber: z.string().trim()
      .min(1, { message: t('validation.phoneRequired') })
      .refine(isValidPhoneNumber, { message: t('validation.phoneInvalid') }),
    accountNumber: z.string().trim()
      .min(1, { message: t('validation.accountNumberRequired') })
      .refine(isValidIBAN, { message: t('validation.ibanInvalid') }),
    firstName: z.string().trim()
      .min(1, { message: t('validation.firstNameRequired') })
      .max(50, { message: t('validation.firstNameTooLong') })
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: t('validation.firstNameInvalidChars') }),
    lastName: z.string().trim()
      .min(1, { message: t('validation.lastNameRequired') })
      .max(50, { message: t('validation.lastNameTooLong') })
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: t('validation.lastNameInvalidChars') }),
    streetName: z.string().trim()
      .min(1, { message: t('validation.streetNameRequired') })
      .max(100, { message: t('validation.streetNameTooLong') })
      .regex(/^[a-zA-ZÀ-ÿ0-9\s\-'\/]+$/, { message: t('validation.streetNameInvalidChars') }),
    houseNumber: z.string().trim()
      .min(1, { message: t('validation.houseNumberRequired') })
      .max(20, { message: t('validation.houseNumberTooLong') })
      .regex(/^[a-zA-Z0-9\s\-\/]+$/, { message: t('validation.houseNumberInvalidChars') }),
    postalCode: z.string().trim()
      .min(1, { message: t('validation.postalCodeRequired') })
      .max(20, { message: t('validation.postalCodeTooLong') })
      .regex(/^[a-zA-Z0-9\s\-]+$/, { message: t('validation.postalCodeInvalidChars') }),
    city: z.string().trim()
      .min(1, { message: t('validation.cityRequired') })
      .max(100, { message: t('validation.cityTooLong') })
      .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, { message: t('validation.cityInvalidChars') }),
    stateProvince: z.string().trim()
      .min(1, { message: t('validation.stateProvinceRequired') })
      .max(100, { message: t('validation.stateProvinceTooLong') })
      .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, { message: t('validation.stateProvinceInvalidChars') }),
    country: z.string().trim().min(1, { message: t('validation.countryRequired') }),
  });

  type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

  // Helper to get localized text (similar to DeviceEstimationPageClient)
  const getLocalizedText = (textInput: TranslatableText | string | undefined, locale: string, defaultLocale: string): string => {
    if (typeof textInput === 'string') return textInput;
    if (textInput && typeof textInput === 'object') {
      if (textInput.en === undefined && Object.keys(textInput).length > 0 && typeof Object.values(textInput)[0] === 'string') {
        return textInput[locale] || textInput[defaultLocale] || Object.values(textInput).find(v => typeof v === 'string') || '';
      }
      return textInput[locale] || textInput[defaultLocale] || textInput.en || '';
    }
    return '';
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      email: '',
      phoneNumber: '',
      accountNumber: '',
      firstName: '',
      lastName: '',
      streetName: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      stateProvince: '',
      country: '',
    },
    mode: 'onChange'
  });

  // Geolocation – pre-fill country field
  const { countryCode } = useGeoLocation();

  useEffect(() => {
    if (countryCode) {
      setValue('country', countryCode);
    }
  }, [countryCode, setValue]);

  // Filter cart items based on deviceId (if provided)
  const relevantCartItems = useMemo(() => {
    if (deviceId) {
      // If deviceId is provided, filter the cart to get only that specific device
      return estimationCart.filter(item => item.deviceId === deviceId);
    }
    // Otherwise, use all items in the cart
    return estimationCart;
  }, [estimationCart, deviceId]);

  const totalEstimatedPrice = useMemo(() => {
    return relevantCartItems.reduce((total, item) => total + (item.estimatedPrice || 0), 0);
  }, [relevantCartItems]);

  const onSubmit = async (data: CheckoutFormData) => {
    if (relevantCartItems.length === 0) {
      alert(t('messages.emptyCartAlert'));
      return;
    }

    // Get the items to process (either the single device or all cart items)
    // For now, we still process only the first item as the current backend API only supports
    // creating orders for one device at a time
    const cartItem = relevantCartItems[0] as InProgressEstimation;
    
    if (!cartItem || !cartItem.deviceModel || typeof cartItem.deviceModel.id !== 'number') {
        console.error("Device model ID is missing or invalid in the cart item.", cartItem);
        createOrderMutation.reset(); 
        alert(t('messages.deviceConfigError'));
        return;
    }

    const tenantIdString = process.env.NEXT_PUBLIC_TENANT_ID;
    const shopIdString = process.env.NEXT_PUBLIC_SHOP_ID;

    if (!tenantIdString || !shopIdString) {
      console.error("Client ID or Shop ID is not configured in environment variables.");
      alert(t('messages.configurationError'));
      return;
    }

    const tenantId = parseInt(tenantIdString, 10);
    const shopId = parseInt(shopIdString, 10);

    if (isNaN(tenantId) || isNaN(shopId)) {
        console.error("Client ID or Shop ID from env is not a valid number.");
        alert(t('messages.invalidConfigError'));
        return;
    }
    
    const orderPayload: CreateOrderPayload = {
      deviceId: cartItem.deviceModel.id,
      deviceSnapshot: {
        modelName: getLocalizedText(cartItem.deviceModel.title, currentLocale, defaultLocale) || 'N/A',
        brand: cartItem.deviceModel.brand ? getLocalizedText(cartItem.deviceModel.brand.title, currentLocale, defaultLocale) : 'N/A',
      },
      estimatedPrice: cartItem.estimatedPrice || 0,
      conditionAnswers: Object.entries(cartItem.answers).map(([questionKey, answerRawValue]) => {
        let questionTextSnapshot = questionKey; // Fallback
        let answerTextSnapshot = String(answerRawValue); // Fallback

        if (cartItem.deviceModel?.questionSetAssignments) {
          for (const assignment of cartItem.deviceModel.questionSetAssignments) {
            if (!assignment.questionSet?.questions) continue;
            const question = assignment.questionSet.questions.find(q => q.key === questionKey || String(q.id) === questionKey);
            if (question) {
              questionTextSnapshot = getLocalizedText(question.title, currentLocale, defaultLocale);
              const option = question.options?.find((opt: any) => 
                opt.key === answerRawValue || String(opt.id) === answerRawValue
              );
              if (option) {
                answerTextSnapshot = getLocalizedText(option.title, currentLocale, defaultLocale);
              }
              break; 
            }
          }
        }
        return {
          questionKey: questionKey,
          questionTextSnapshot: questionTextSnapshot,
          answerValue: answerTextSnapshot,
          answerTextSnapshot: answerTextSnapshot,
        };
      }),
      sellerAddress: {
        name: `${data.firstName} ${data.lastName}`,
        street1: `${data.streetName} ${data.houseNumber}`,
        city: data.city,
        stateProvince: data.stateProvince,
        postalCode: data.postalCode,
        countryCode: data.country,
        phoneNumber: data.phoneNumber,
        email: data.email,
      },
      tenantId: tenantId,
      shopId: shopId,
    };

    createOrderMutation.mutate(orderPayload, {
      onSuccess: (response: CreateOrderResponseData) => {
        try {
          const orderRef = response.orderNumber || response.orderId;
          const encodedRef = encodeURIComponent(orderRef ?? '');
          router.push(`/${currentLocale}/sell/thank-you?orderRef=${encodedRef}`);
        } catch (parseErr) {
          console.error('Failed to parse order reference from response', parseErr);
          router.push(`/${currentLocale}/sell/thank-you`);
        }
      },
      onError: (err) => {
        console.error("Order submission caught an error:", err);
      }
    });
  };

  const handleEditItem = (deviceId: string) => {
    router.push(`/${currentLocale}/sell/${deviceId}/estimate`);
  };

  const handleRemoveItem = (deviceId: string) => {
    setEstimationCart(prevCart => prevCart.filter(item => item.deviceId !== deviceId));
  };

  // Define an interface for the question-answer pairs
  interface QuestionAnswer {
    question: string;
    answer: string;
    originalKey?: string; // Store original key for debugging
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const getEnhancedLocalizedText = (
    textObj: any, 
    locale: string, 
    defaultLocale: string,
    debugContext?: string
  ): string => {
    if (!textObj) return '';
    if (typeof textObj === 'string') return textObj;
    
    const availableLocales = typeof textObj === 'object' ? Object.keys(textObj) : [];
    let result = '';
    
    // Try current locale first
    if (locale && textObj[locale]) {
      result = textObj[locale];
      console.log(`[Language] Found text in current locale (${locale}): ${result.substring(0, 30)}${result.length > 30 ? '...' : ''}`);
    }
    // Then try default locale
    else if (defaultLocale && textObj[defaultLocale]) {
      result = textObj[defaultLocale];
      console.log(`[Language] Fallback to default locale (${defaultLocale}): ${result.substring(0, 30)}${result.length > 30 ? '...' : ''}`);
    }
    // Finally, try any available locale
    else if (availableLocales.length > 0) {
      result = textObj[availableLocales[0]];
      console.log(`[Language] Fallback to first available locale (${availableLocales[0]}): ${result.substring(0, 30)}${result.length > 30 ? '...' : ''}`);
    }
    
    if (!result && debugContext) {
      console.log(`[Language] No localized text found for ${debugContext}. Available locales:`, availableLocales);
    }
    
    return result;
  };

  // This function gets the full text for each question and answer based on the processedQuestions
  const getAnsweredQuestionsListForItem = (item: InProgressEstimation): QuestionAnswer[] => {
    console.log('getAnsweredQuestionsListForItem - item:', {
      deviceId: item.deviceId,
      answers: Object.keys(item.answers || {}).length,
      hasModel: !!item.deviceModel,
      hasQuestionSetAssignments: !!item.deviceModel?.questionSetAssignments,
      currentLocale,
      defaultLocale
    });
    
    if (!item?.answers) return [];
    
    // We'll map question indices (1, 2, 3) to actual question texts
    // This approach works even when the keys are numeric indexes rather than actual question keys
    const answeredQuestions: QuestionAnswer[] = [];
    
    // Loop through the questions in order, find the corresponding answer by index
    // This ensures the questions display in the correct order regardless of how they're stored
    const questions: any[] = [];
    
    if (item.deviceModel?.questionSetAssignments) {
      for (const assignment of item.deviceModel.questionSetAssignments) {
        if (assignment.questionSet?.questions) {
          questions.push(...assignment.questionSet.questions);
        }
      }
    }
    
    console.log(`Found ${questions.length} questions in the device model`);
    
    // Now match the answers to the questions
    Object.entries(item.answers).forEach(([questionKey, answerValue]) => {
      // Find the matching question by comparing key OR numeric id string
      const question = questions.find(q => q.key === questionKey || String(q.id) === questionKey);
      
      let questionText = questionKey; // Default fallback
      let answerText = String(answerValue); // Default fallback
      
      if (question) {
        console.log(`[Language] Processing question:`, {
          id: question.id,
          key: question.key,
          hasTitle: !!question.title,
          isTitleObject: question.title && typeof question.title === 'object',
          availableLanguages: question.title && typeof question.title === 'object' ? Object.keys(question.title) : 'N/A',
        });
        
        // Get the question text with enhanced localization
        questionText = getEnhancedLocalizedText(
          question.title, 
          currentLocale, 
          defaultLocale,
          `question (ID: ${question.id}, Key: ${question.key})`
        );
        
        // Try to find the matching option
        const option = question.options?.find((opt: any) => 
          opt.key === answerValue || String(opt.id) === answerValue
        );
        
        if (option) {
          console.log(`[Language] Processing option:`, {
            id: option.id,
            key: option.key,
            hasTitle: !!option.title,
            isTitleObject: option.title && typeof option.title === 'object',
            availableLanguages: option.title && typeof option.title === 'object' ? Object.keys(option.title) : 'N/A',
          });
          
          // Get the answer text with enhanced localization
          answerText = getEnhancedLocalizedText(
            option.title, 
            currentLocale, 
            defaultLocale,
            `option (ID: ${option.id}, Key: ${option.key})`
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
    
    return answeredQuestions;
  };

  if (relevantCartItems.length === 0) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4" style={{ backgroundColor: backgroundColor }}>
        <div className="bg-white p-10 rounded-xl shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{t('emptyCart.title')}</h2>
          <p className="text-gray-600 mb-8">{t('emptyCart.description')}</p>
          <a 
            href={`/${currentLocale}`}
            className="px-6 py-3 text-white font-semibold rounded-md hover:bg-opacity-90 transition-colors duration-150 text-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {t('emptyCart.browseDevices')}
          </a>
        </div>
      </div>
    );
  }
  
  const contentBackgroundColor = backgroundColor;

  return (
    <div style={{ backgroundColor: contentBackgroundColor }} className="flex-grow w-full">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold mb-6 text-gray-700">{t('title')}</h1>

        {createOrderMutation.isError && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative flex items-center" role="alert">
            <AlertCircle className="h-5 w-5 mr-2" />
            <div>
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline ml-1">
                {createOrderMutation.error instanceof Error ? createOrderMutation.error.message : t('messages.orderError')}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-8 gap-y-10">
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1">{t('form.email')}</label>
                <input type="email" id="email" {...register("email")} className={`block w-full p-2.5 border ${errors.email ? 'border-red-500' : 'border-gray-200'} bg-gray-50 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm`} />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-xs font-medium text-gray-600 mb-1">{t('form.phoneNumber')}</label>
                <Controller
                  name="phoneNumber"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      {...field}
                      id="phoneNumber"
                      international
                      defaultCountry={(countryCode ?? 'ET') as CountryCode}
                      className={errors.phoneNumber ? 'phone-input-error-wrapper' : ''}
                      placeholder={t('form.phoneNumberPlaceholder')}
                    />
                  )}
                />
                {errors.phoneNumber && <p className="mt-1 text-xs text-red-500">{errors.phoneNumber.message}</p>}
              </div>

              <div>
                <label htmlFor="accountNumber" className="block text-xs font-medium text-gray-600 mb-1">{t('form.accountNumber')}</label>
                <input type="text" id="accountNumber" {...register("accountNumber")} className={`block w-full p-2.5 border ${errors.accountNumber ? 'border-red-500' : 'border-gray-200'} bg-gray-50 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm`} placeholder={t('form.ibanPlaceholder')} />
                {errors.accountNumber && <p className="mt-1 text-xs text-red-500">{errors.accountNumber.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                <div>
                  <label htmlFor="firstName" className="block text-xs font-medium text-gray-600 mb-1">{t('form.firstName')}</label>
                  <input type="text" id="firstName" {...register("firstName")} className={`block w-full p-2.5 border ${errors.firstName ? 'border-red-500' : 'border-gray-200'} bg-gray-50 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm`} />
                  {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-xs font-medium text-gray-600 mb-1">{t('form.lastName')}</label>
                  <input type="text" id="lastName" {...register("lastName")} className={`block w-full p-2.5 border ${errors.lastName ? 'border-red-500' : 'border-gray-200'} bg-gray-50 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm`} />
                  {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                <div className="col-span-2">
                  <label htmlFor="streetName" className="block text-xs font-medium text-gray-600 mb-1">{t('form.streetName')}</label>
                  <input type="text" id="streetName" {...register("streetName")} className={`block w-full p-2.5 border ${errors.streetName ? 'border-red-500' : 'border-gray-200'} bg-gray-50 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm`} />
                  {errors.streetName && <p className="mt-1 text-xs text-red-500">{errors.streetName.message}</p>}
                </div>
                <div>
                  <label htmlFor="houseNumber" className="block text-xs font-medium text-gray-600 mb-1">{t('form.houseNumber')}</label>
                  <input type="text" id="houseNumber" {...register("houseNumber")} className={`block w-full p-2.5 border ${errors.houseNumber ? 'border-red-500' : 'border-gray-200'} bg-gray-50 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm`} />
                  {errors.houseNumber && <p className="mt-1 text-xs text-red-500">{errors.houseNumber.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                <div>
                  <label htmlFor="postalCode" className="block text-xs font-medium text-gray-600 mb-1">{t('form.postalCode')}</label>
                  <input type="text" id="postalCode" {...register("postalCode")} className={`block w-full p-2.5 border ${errors.postalCode ? 'border-red-500' : 'border-gray-200'} bg-gray-50 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm`} />
                  {errors.postalCode && <p className="mt-1 text-xs text-red-500">{errors.postalCode.message}</p>}
                </div>
                <div>
                  <label htmlFor="city" className="block text-xs font-medium text-gray-600 mb-1">{t('form.city')}</label>
                  <input type="text" id="city" {...register("city")} className={`block w-full p-2.5 border ${errors.city ? 'border-red-500' : 'border-gray-200'} bg-gray-50 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm`} />
                  {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                <div>
                  <label htmlFor="stateProvince" className="block text-xs font-medium text-gray-600 mb-1">{t('form.stateProvince')}</label>
                  <input 
                    type="text" 
                    id="stateProvince" 
                    {...register("stateProvince")} 
                    className={`block w-full p-2.5 border ${errors.stateProvince ? 'border-red-500' : 'border-gray-200'} bg-gray-50 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm`} 
                    placeholder={t('form.stateProvincePlaceholder')}
                  />
                  {errors.stateProvince && <p className="mt-1 text-xs text-red-500">{errors.stateProvince.message}</p>}
                </div>
                <div>
                  <label htmlFor="country" className="block text-xs font-medium text-gray-600 mb-1">{t('form.country')}</label>
                  <select
                    id="country"
                    {...register("country")}
                    className={`block w-full p-2.5 border ${errors.country ? 'border-red-500' : 'border-gray-200'} bg-gray-50 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                  >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {errors.country && <p className="mt-1 text-xs text-red-500">{errors.country.message}</p>}
                </div>
              </div>

              <div className="pt-5">
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {createOrderMutation.isPending ? t('buttons.processing') : t('buttons.placeOrder')}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="p-1">
              <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b border-gray-300 pb-3">{t('sections.orderSummary').toUpperCase()}</h2>
              
              {relevantCartItems.map((item) => {
                const deviceModel = item.deviceModel;
                const deviceName = getLocalizedText(deviceModel.title, currentLocale, defaultLocale);
                const deviceImageUrl = deviceModel.model_image || '/placeholder-image.png';
                const specifications = deviceModel.specifications;
                const storage = specifications && typeof specifications.storage === 'string' ? specifications.storage : 'N/A';
                const answeredQuestions = getAnsweredQuestionsListForItem(item);

                return (
                  <div key={item.deviceId} className="mb-4 border border-gray-200 rounded-md p-4">
                      <div className="flex items-start">
                          <img src={deviceImageUrl} alt={deviceName} className="w-16 h-auto object-contain rounded-md mr-3 mt-1"/>
                          <div className="flex-grow">
                              <h3 className="text-base font-medium text-gray-900 mb-0.5">{deviceName}</h3>
                              <p className="text-xs text-gray-500">
                                  {deviceModel.brand ? getLocalizedText(deviceModel.brand.title, currentLocale, defaultLocale) : ''}
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
                                  title={t('buttons.editItem')}
                              >
                                  <Pencil size={16} />
                              </button>
                              <button 
                                  onClick={() => handleRemoveItem(item.deviceId)} 
                                  className="p-1 text-gray-400 hover:text-red-600"
                                  title={t('buttons.removeItem')}
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </div>

                      {answeredQuestions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100" data-component-name="DefaultCheckout">
                              <h4 className="text-xs font-medium text-gray-600 mb-1.5" data-component-name="DefaultCheckout">{t('summary.condition')}:</h4>
                              <ul className="space-y-0.5" data-component-name="DefaultCheckout">
                                  {answeredQuestions.map((qa, index) => {
                                      // Skip entries where both question and answer are just numbers
                                      const isJustNumbers = !isNaN(Number(qa.question)) && !isNaN(Number(qa.answer));
                                      // Skip numeric-only entries, but keep entries that start with 'Question'
                                      const isFormattedQuestion = qa.question.startsWith('Question ');
                                      // Don't skip if either contains non-numeric content or is a formatted question
                                      const shouldShow = isFormattedQuestion || !isJustNumbers || 
                                          qa.question.trim() !== String(Number(qa.question)) || 
                                          qa.answer.trim() !== String(Number(qa.answer));
                                      
                                      if (!shouldShow) {
                                          console.log(`Skipping numeric-only condition item: ${qa.question}: ${qa.answer}`);
                                          return null;
                                      }
                                      
                                      console.log(`Rendering condition item ${index}:`, qa);
                                      return (
                                          <li key={index} className="text-xs text-gray-500" data-component-name="DefaultCheckout">
                                              <span className="font-medium text-gray-700">{qa.question}:</span> {qa.answer}
                                          </li>
                                      );
                                  }).filter(Boolean)}
                                  {answeredQuestions.length === 0 && (
                                      <li className="text-xs text-gray-500" data-component-name="DefaultCheckout">
                                          {t('summary.noConditionInfo') || 'No condition information available.'}
                                      </li>
                                  )}
                              </ul>
                          </div>
                      )}
                  </div>
              );
              })}
              
              <div className="mt-6 pt-4 border-t border-gray-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">{t('summary.subtotal')}</span>
                  <span className="text-sm font-medium text-gray-800">€ {totalEstimatedPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">{t('summary.shipping')}</span>
                  <span className="text-sm font-medium text-gray-800">{t('summary.free')}</span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                  <span className="text-base font-semibold text-gray-800">{t('summary.total')}</span>
                  <span className="text-lg font-bold" style={{color: primaryColor}}>€ {totalEstimatedPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 