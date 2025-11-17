import React, { useMemo } from 'react';
import { useAtom } from 'jotai';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { isValidIBAN } from 'ibantools';
import { PhoneInput } from '@/components/ui/phone-input';
import { Pencil, Trash2, CreditCard, Truck, ShoppingBag, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { estimationCartAtom } from '@/store/atoms';
import { CheckoutVariantProps } from './index';
import { useCreateOrder } from '@/hooks/useOrders';
import { CreateOrderPayload } from '@/lib/api/orderService';
import type { CreateOrderResponseData } from '@/lib/api/orderService';
import { InProgressEstimation } from '@/store/atoms';
import { getLocalizedText } from '@/utils/localization';
import { countries } from '@/utils/countries';

export function CardCheckout({
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

  // Updated Zod Schema for Checkout Form Validation with enhanced address validation
  const checkoutFormSchema = useMemo(() => z.object({
    email: z.string().trim().email({ message: t('validation.emailInvalid') }).min(1, { message: t('validation.emailRequired') }),
    phoneNumber: z.string().trim()
      .min(1, { message: t('validation.phoneNumberRequired') })
      .refine(value => isValidPhoneNumber(value), {
        message: t('validation.phoneNumberInvalid'),
      }),
    firstName: z.string().trim()
      .min(1, { message: t('validation.firstNameRequired') })
      .max(50, { message: t('validation.firstNameTooLong') })
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: t('validation.firstNameInvalidChars') }),
    lastName: z.string().trim()
      .min(1, { message: t('validation.lastNameRequired') })
      .max(50, { message: t('validation.lastNameTooLong') })
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: t('validation.lastNameInvalidChars') }),
    accountNumber: z.string().trim()
      .min(1, { message: t('validation.accountNumberRequired') })
      .refine((value) => isValidIBAN(value), {
        message: t('validation.ibanInvalid')
      }),
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
  }), [t]);

  type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

  const {
    register,
    handleSubmit,
    control,
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
        let questionTextSnapshot = questionKey; // default fallback
        let answerTextSnapshot = String(answerRawValue); // default fallback

        if (cartItem.deviceModel?.questionSetAssignments) {
          for (const assignment of cartItem.deviceModel.questionSetAssignments) {
            if (!assignment.questionSet?.questions) continue;
            const question = assignment.questionSet.questions.find(q => q.key === questionKey || String(q.id) === questionKey);
            if (question) {
              questionTextSnapshot = getLocalizedText(question.title, currentLocale, defaultLocale);
              const option = question.options.find(opt => opt.key === answerRawValue || String(opt.id) === answerRawValue);
              if (option) {
                answerTextSnapshot = getLocalizedText(option.title, currentLocale, defaultLocale);
              }
              break;
            }
          }
        }

        return {
          questionKey,
          questionTextSnapshot,
          // send the actual answer text
          answerValue: answerTextSnapshot,
          answerTextSnapshot,
        };
      }),
      sellerAddress: {
        name: `${data.firstName} ${data.lastName}`,
        street1: data.streetName + ' ' + data.houseNumber,
        city: data.city,
        stateProvince: data.stateProvince || '',
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

  // ----- Helper utilities for displaying answered questions (borrowed from DefaultCheckout) -----
  interface QuestionAnswer {
    question: string;
    answer: string;
    originalKey?: string;
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

    // Prefer current locale
    if (locale && textObj[locale]) {
      result = textObj[locale];
    } else if (defaultLocale && textObj[defaultLocale]) {
      result = textObj[defaultLocale];
    } else if (availableLocales.length > 0) {
      result = textObj[availableLocales[0]];
    }

    if (!result && debugContext) {
      console.log(`[Language] No localized text found for ${debugContext}. Available locales:`, availableLocales);
    }

    return result;
  };

  const getAnsweredQuestionsListForItem = (item: InProgressEstimation): QuestionAnswer[] => {
    if (!item?.answers) return [];

    const answeredQuestions: QuestionAnswer[] = [];
    const questions: any[] = [];

    if (item.deviceModel?.questionSetAssignments) {
      for (const assignment of item.deviceModel.questionSetAssignments) {
        if (assignment.questionSet?.questions) {
          questions.push(...assignment.questionSet.questions);
        }
      }
    }

    // sort by orderNo
    const sortedQuestions = questions.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0));

    Object.entries(item.answers).forEach(([questionKey, answerValue]) => {
      const isNumericKey = !isNaN(Number(questionKey));
      const questionIndex = isNumericKey ? Number(questionKey) - 1 : null;

      let question: any = null;
      if (questionIndex !== null && questionIndex >= 0 && questionIndex < sortedQuestions.length) {
        question = sortedQuestions[questionIndex];
      } else {
        question = sortedQuestions.find(q => q.key === questionKey || String(q.id) === questionKey);
      }

      let questionText = questionKey;
      let answerText = String(answerValue);

      if (question) {
        questionText = getEnhancedLocalizedText(question.title, currentLocale, defaultLocale);
        const option = question.options?.find((opt: any) => opt.key === answerValue || String(opt.id) === answerValue);
        if (option) {
          answerText = getEnhancedLocalizedText(option.title, currentLocale, defaultLocale);
        }
      }

      if (questionText === questionKey) {
        questionText = questionKey.replace(/_/g, ' ').replace(/^(\d+)$/, 'Question $1');
      }

      answeredQuestions.push({ question: questionText, answer: answerText, originalKey: questionKey });
    });

    // sort answeredQuestions by numeric original keys if present
    const sortedAnswers = [...answeredQuestions].sort((a, b) => {
      if (a.originalKey && b.originalKey) {
        const indexA = parseInt(a.originalKey);
        const indexB = parseInt(b.originalKey);
        if (!isNaN(indexA) && !isNaN(indexB)) {
          return indexA - indexB;
        }
      }
      return 0;
    });

    return sortedAnswers;
  };

  if (relevantCartItems.length === 0) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4" style={{ backgroundColor }}>
        <div className="bg-white p-10 rounded-xl shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{t('emptyCart.title')}</h2>
          <p className="text-gray-600 mb-8">{t('emptyCart.description')}</p>
          <a 
            href={`/${currentLocale}`}
            className="px-6 py-3 text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors duration-150 inline-block"
            style={{ backgroundColor: primaryColor }}
          >
            {t('emptyCart.browseDevices')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor }} className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-10">{t('title')}</h1>
        
        {/* Global Error Message Area */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Order Summary Card */}
          <div className="lg:order-2">
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 sticky top-6">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center mb-4">
                  <ShoppingBag size={20} className="mr-2" style={{ color: primaryColor }} />
                  <h2 className="text-xl font-semibold">{t('sections.orderSummary')}</h2>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {relevantCartItems.map((item) => {
                    const deviceName = getLocalizedText(item.deviceModel.title, currentLocale, defaultLocale);
                    const deviceImageUrl = item.deviceModel.model_image || '/placeholder-image.png';
                    const specifications = item.deviceModel.specifications;
                    const storage = specifications && typeof specifications.storage === 'string' ? specifications.storage : 'N/A';
                    // Generate answered questions list for display
                    const answeredQuestions = getAnsweredQuestionsListForItem(item);
                    
                    return (
                      <div key={item.deviceId} className="py-4">
                        <div className="flex items-center">
                          <img src={deviceImageUrl} alt={deviceName} className="w-14 h-14 object-contain rounded-md mr-3" />
                          <div className="flex-grow">
                            <h3 className="font-medium text-gray-800">{deviceName}</h3>
                            <p className="text-xs text-gray-500">
                              {item.deviceModel.brand?.title ? getLocalizedText(item.deviceModel.brand.title, currentLocale, defaultLocale) : ''}{storage !== 'N/A' ? ` | ${storage}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-medium">€ {item.estimatedPrice?.toFixed(2) ?? '0.00'}</span>
                            <div className="flex mt-1 space-x-1">
                              <button 
                                onClick={() => handleEditItem(item.deviceId)} 
                                className="text-gray-500 hover:text-blue-600"
                                title={t('buttons.editItem')}
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                onClick={() => handleRemoveItem(item.deviceId)} 
                                className="text-gray-500 hover:text-red-600"
                                title={t('buttons.removeItem')}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {answeredQuestions.length > 0 && (
                          <div className="mt-2 ml-14 pt-2 border-t border-gray-100">
                            <h4 className="text-xs font-medium text-gray-600 mb-1.5">{t('summary.condition')}</h4>
                            <ul className="space-y-0.5">
                              {answeredQuestions.map((qa, idx) => (
                                <li key={idx} className="text-xs text-gray-500">
                                  <span className="font-medium text-gray-700">{qa.question}:</span> {qa.answer}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">{t('summary.subtotal')}</span>
                  <span>€ {totalEstimatedPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">{t('summary.shipping')}</span>
                  <span>{t('summary.free')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-4 pt-4 border-t border-gray-100">
                  <span>{t('summary.total')}</span>
                  <span style={{ color: primaryColor }}>€ {totalEstimatedPrice.toFixed(2)}</span>
                </div>
                
                <div className="mt-6">
                  <button 
                    onClick={handleSubmit(onSubmit)}
                    disabled={createOrderMutation.isPending}
                    className="w-full py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {createOrderMutation.isPending ? t('buttons.processing') : t('buttons.completeOrder')}
                  </button>
                  <button 
                    onClick={() => router.push(`/${currentLocale}`)}
                    className="w-full mt-3 text-gray-600 font-medium py-2"
                  >
                    {t('buttons.addMoreDevices')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Shipping Information */}
          <div className="lg:order-1">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Customer Information Card */}
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="flex items-center mb-4">
                  <CreditCard size={20} className="mr-2" style={{ color: primaryColor }} />
                  <h2 className="text-xl font-semibold">{t('sections.customerInformation')}</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.email')}</label>
                    <input 
                      type="email" 
                      {...register("email")}
                      className={`w-full p-3 border ${errors.email ? 'border-red-500' : 'border-gray-200'} rounded-lg bg-gray-50`}
                      placeholder={t('form.emailPlaceholder')}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.phoneNumber')}</label>
                    <Controller
                      name="phoneNumber"
                      control={control}
                      render={({ field }) => (
                        <PhoneInput
                          {...field}
                          international
                          defaultCountry="ET"
                          className={errors.phoneNumber ? 'phone-input-error-wrapper' : ''}
                          placeholder={t('form.phoneNumberPlaceholder')}
                        />
                      )}
                    />
                    {errors.phoneNumber && <p className="mt-1 text-xs text-red-500">{errors.phoneNumber.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.accountNumberOptional')}</label>
                    <input 
                      type="text" 
                      {...register("accountNumber")}
                      className={`w-full p-3 border ${errors.accountNumber ? 'border-red-500' : 'border-gray-200'} rounded-lg bg-gray-50`}
                      placeholder={t('form.ibanPlaceholder')}
                    />
                    {errors.accountNumber && <p className="mt-1 text-xs text-red-500">{errors.accountNumber.message}</p>}
                  </div>
                </div>
              </div>
              
              {/* Shipping Address Card */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center mb-4">
                  <Truck size={20} className="mr-2" style={{ color: primaryColor }} />
                  <h2 className="text-xl font-semibold">{t('sections.shippingAddress')}</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.firstName')}</label>
                      <input 
                        type="text" 
                        {...register("firstName")}
                        className={`w-full p-3 border ${errors.firstName ? 'border-red-500' : 'border-gray-200'} rounded-lg bg-gray-50`}
                        placeholder={t('form.firstNamePlaceholder')}
                      />
                      {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.lastName')}</label>
                      <input 
                        type="text" 
                        {...register("lastName")}
                        className={`w-full p-3 border ${errors.lastName ? 'border-red-500' : 'border-gray-200'} rounded-lg bg-gray-50`}
                        placeholder={t('form.lastNamePlaceholder')}
                      />
                      {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.streetName')}</label>
                      <input 
                        type="text" 
                        {...register("streetName")}
                        className={`w-full p-3 border ${errors.streetName ? 'border-red-500' : 'border-gray-200'} rounded-lg bg-gray-50`}
                        placeholder={t('form.streetNamePlaceholder')}
                      />
                      {errors.streetName && <p className="mt-1 text-xs text-red-500">{errors.streetName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.houseNumber')}</label>
                      <input 
                        type="text" 
                        {...register("houseNumber")}
                        className={`w-full p-3 border ${errors.houseNumber ? 'border-red-500' : 'border-gray-200'} rounded-lg bg-gray-50`}
                        placeholder={t('form.houseNumberPlaceholder')}
                      />
                      {errors.houseNumber && <p className="mt-1 text-xs text-red-500">{errors.houseNumber.message}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.postalCode')}</label>
                      <input 
                        type="text" 
                        {...register("postalCode")}
                        className={`w-full p-3 border ${errors.postalCode ? 'border-red-500' : 'border-gray-200'} rounded-lg bg-gray-50`}
                        placeholder={t('form.postalCodePlaceholder')}
                      />
                      {errors.postalCode && <p className="mt-1 text-xs text-red-500">{errors.postalCode.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.city')}</label>
                      <input 
                        type="text" 
                        {...register("city")}
                        className={`w-full p-3 border ${errors.city ? 'border-red-500' : 'border-gray-200'} rounded-lg bg-gray-50`}
                        placeholder={t('form.cityPlaceholder')}
                      />
                      {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.stateProvince')}</label>
                      <input 
                        type="text" 
                        {...register("stateProvince")}
                        className={`w-full p-3 border ${errors.stateProvince ? 'border-red-500' : 'border-gray-200'} rounded-lg bg-gray-50`}
                        placeholder={t('form.stateProvincePlaceholder')}
                      />
                      {errors.stateProvince && <p className="mt-1 text-xs text-red-500">{errors.stateProvince.message}</p>}
                    </div>
                    <div className="mb-4">
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('form.country')} *
                      </label>
                      <select
                        id="country"
                        {...register("country")}
                        className={`w-full p-2 border ${errors.country ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                      >
                        <option value="">{t('form.selectCountryPlaceholder')}</option>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                      {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p>
                  {t('messages.termsAndConditions')}
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 