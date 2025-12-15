/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { isValidIBAN } from 'ibantools';
import { PhoneInput } from '@/components/ui/phone-input';
import { Pencil, Trash2, ChevronRight, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { estimationCartAtom, InProgressEstimation } from '@/store/atoms';
import { CheckoutVariantProps } from './index';
import { useCreateOrder } from '@/hooks/useOrders';
import { CreateOrderPayload } from '@/lib/api/orderService';
import { getLocalizedText } from '@/utils/localization';
import { countries } from '@/utils/countries';
import type { CountryCode } from 'libphonenumber-js';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import type { CreateOrderResponseData } from '@/lib/api/orderService';

type CheckoutStep = 'cart' | 'info' | 'review';

export function SplitCheckout({
  currentLocale,
  defaultLocale,
  primaryColor,
  backgroundColor = '#f3f4f6',
  deviceId
}: CheckoutVariantProps) {
  const [currentStep, setCurrentStep] = React.useState<CheckoutStep>('cart');
  const [estimationCart, setEstimationCart] = useAtom(estimationCartAtom);
  const router = useRouter();
  const createOrderMutation = useCreateOrder();
  const t = useTranslations('Checkout');

  // Track when order has been submitted to prevent showing empty cart during redirect
  const [isOrderSubmitted, setIsOrderSubmitted] = useState(false);

  // Updated Zod Schema for Checkout Form Validation with enhanced address validation
  const checkoutFormSchema = useMemo(() => z.object({
    email: z.string().trim().email({ message: t('validation.emailInvalid') }).min(1, { message: t('validation.emailRequired') }),
    phoneNumber: z.string().trim()
      .min(1, { message: t('validation.phoneRequired') })
      .refine(isValidPhoneNumber, { message: t('validation.phoneInvalid') }),
    accountNumber: z.string().trim()
      .min(1, { message: t('validation.accountNumberRequired') })
      .refine((value) => isValidIBAN(value), {
        message: t('validation.ibanInvalid')
      }),
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
  }), [t]);

  type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
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

  const { countryCode } = useGeoLocation();

  useEffect(() => {
    if (countryCode) {
      setValue('country', countryCode);
    }
  }, [countryCode, setValue]);

  const watchedFormValues = watch();

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

  const handleFinalSubmit = async (data: CheckoutFormData) => {
    if (relevantCartItems.length === 0) {
      alert(t('messages.emptyCartAlert'));
      setCurrentStep('cart');
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
      setCurrentStep('cart');
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
        let questionTextSnapshot = questionKey;
        let answerTextSnapshot = String(answerRawValue);

        if (cartItem.deviceModel?.questionSetAssignments) {
          for (const assignment of cartItem.deviceModel.questionSetAssignments) {
            if (!assignment.questionSet?.questions) continue;
            const question = assignment.questionSet.questions.find(q => q.key === questionKey || String(q.id) === questionKey);
            if (question) {
              questionTextSnapshot = getLocalizedText(question.title, currentLocale, defaultLocale);
              const option = question.options.find(opt => opt.key === answerRawValue || String(opt.id) === answerRawValue);
              if (option) {
                answerTextSnapshot = getEnhancedLocalizedText(option.title, currentLocale, defaultLocale);
              }
              break;
            }
          }
        }

        return {
          questionKey: questionKey,
          questionTextSnapshot,
          answerValue: answerTextSnapshot,
          answerTextSnapshot,
        };
      }),
      sellerAddress: {
        name: `${data.firstName} ${data.lastName}`,
        street1: `${data.streetName} ${data.houseNumber}`,
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

    // Mark order as submitted to prevent empty cart UI during redirect
    setIsOrderSubmitted(true);

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
        // Reset the submitted flag on error so user can try again
        setIsOrderSubmitted(false);
      }
    });
  };

  const handleEditItem = (deviceId: string) => {
    router.push(`/${currentLocale}/sell/${deviceId}/estimate`);
  };

  const handleRemoveItem = (deviceId: string) => {
    setEstimationCart(prevCart => prevCart.filter(item => item.deviceId !== deviceId));
  };

  // ------ Helper to create readable Q&A list ------
  interface QuestionAnswer { question: string; answer: string; originalKey?: string; }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const getEnhancedLocalizedText = (txt: any, locale: string, def: string): string => {
    if (!txt) return '';
    if (typeof txt === 'string') return txt;
    return txt[locale] || txt[def] || Object.values(txt)[0] || '';
  };

  const getAnsweredQuestionsListForItem = (item: InProgressEstimation): QuestionAnswer[] => {
    if (!item?.answers) return [];
    const questions: any[] = [];
    if (item.deviceModel?.questionSetAssignments) {
      for (const ass of item.deviceModel.questionSetAssignments) {
        if (ass.questionSet?.questions) questions.push(...ass.questionSet.questions);
      }
    }
    const sorted = questions.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0));
    return Object.entries(item.answers).map(([k, v]) => {
      const q = sorted.find(qi => qi.key === k || String(qi.id) === k);
      let qText = k, aText = String(v);
      if (q) {
        qText = getEnhancedLocalizedText(q.title, currentLocale, defaultLocale);
        const opt = q.options?.find((o: any) => o.key === v || String(o.id) === v);
        if (opt) aText = getEnhancedLocalizedText(opt.title, currentLocale, defaultLocale);
      }
      return { question: qText, answer: aText, originalKey: k };
    });
  };

  // Show loading state if order was submitted (redirecting to thank-you page)
  // This prevents the empty cart message from flashing during navigation
  if (isOrderSubmitted || createOrderMutation.isPending) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4" style={{ backgroundColor }}>
        <div className="bg-white p-10 rounded-lg shadow-xl text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: primaryColor }}></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('buttons.processing')}</h2>
          <p className="text-gray-600">{t('messages.pleaseWait') || 'Please wait...'}</p>
        </div>
      </div>
    );
  }

  if (relevantCartItems.length === 0 && currentStep !== 'cart') {
    setCurrentStep('cart');
  }

  if (relevantCartItems.length === 0 && currentStep === 'cart') {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4" style={{ backgroundColor }}>
        <div className="bg-white p-10 rounded-lg shadow-xl text-center max-w-md">
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

  const renderCartStep = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">{t('sections.yourDevices')}</h2>

      <div className="space-y-4 mb-8">
        {relevantCartItems.map((item) => {
          const deviceModel = item.deviceModel;
          const deviceName = getLocalizedText(deviceModel.title, currentLocale, defaultLocale);
          const deviceImageUrl = deviceModel.model_image || '/placeholder-image.png';
          const specifications = deviceModel.specifications;
          const storage = specifications && typeof specifications.storage === 'string' ? specifications.storage : 'N/A';

          return (
            <div key={item.deviceId} className="flex items-start border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
              <img src={deviceImageUrl} alt={deviceName} className="w-20 h-20 object-contain mr-4" />
              <div className="flex-grow">
                <div className="flex justify-between">
                  <h3 className="font-medium">{deviceName}</h3>
                  <span className="font-bold">€ {item.estimatedPrice?.toFixed(2) ?? '0.00'}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {deviceModel.brand?.title ? getLocalizedText(deviceModel.brand.title, currentLocale, defaultLocale) : ''} {storage !== 'N/A' ? `- ${storage}` : ''}
                </p>
                <div className="flex mt-2 gap-2">
                  <button
                    onClick={() => handleEditItem(item.deviceId)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 flex items-center"
                  >
                    <Pencil size={12} className="mr-1" /> {t('buttons.edit')}
                  </button>
                  <button
                    onClick={() => handleRemoveItem(item.deviceId)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-red-600 flex items-center"
                  >
                    <Trash2 size={12} className="mr-1" /> {t('buttons.remove')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t pt-4 mt-6">
        <div className="flex justify-between items-center text-lg font-bold mb-6">
          <span>{t('summary.total')}</span>
          <span style={{ color: primaryColor }}>€ {totalEstimatedPrice.toFixed(2)}</span>
        </div>

        <button
          onClick={() => setCurrentStep('info')}
          disabled={estimationCart.length === 0}
          className="w-full flex justify-center items-center py-3 px-4 text-white font-medium rounded-md transition-all disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {t('buttons.continueToShipping')} <ChevronRight size={16} className="ml-2" />
        </button>

        <button
          onClick={() => router.push(`/${currentLocale}/#categories`)}
          className="w-full mt-3 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
        >
          {t('buttons.addAnotherDevice')}
        </button>
      </div>
    </div>
  );

  const renderInfoStep = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">{t('sections.shippingInformation')}</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.firstName')}</label>
            <input
              type="text"
              {...register("firstName")}
              className={`w-full p-2 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              placeholder={t('form.firstNamePlaceholder')}
            />
            {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.lastName')}</label>
            <input
              type="text"
              {...register("lastName")}
              className={`w-full p-2 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              placeholder={t('form.lastNamePlaceholder')}
            />
            {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.email')}</label>
          <input
            type="email"
            {...register("email")}
            className={`w-full p-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md`}
            placeholder={t('form.emailPlaceholder')}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
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
                defaultCountry={(countryCode ?? 'ET') as CountryCode}
                className={errors.phoneNumber ? 'phone-input-error-wrapper' : ''}
                placeholder={t('form.phoneNumberPlaceholder')}
              />
            )}
          />
          {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.accountNumberOptional')}</label>
          <input
            type="text"
            {...register("accountNumber")}
            className={`w-full p-2 border ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'} rounded-md`}
            placeholder={t('form.ibanPlaceholder')}
          />
          {errors.accountNumber && <p className="text-xs text-red-500 mt-1">{errors.accountNumber.message}</p>}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.streetName')}</label>
            <input
              type="text"
              {...register("streetName")}
              className={`w-full p-2 border ${errors.streetName ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              placeholder={t('form.streetNamePlaceholder')}
            />
            {errors.streetName && <p className="text-xs text-red-500 mt-1">{errors.streetName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.houseNumber')}</label>
            <input
              type="text"
              {...register("houseNumber")}
              className={`w-full p-2 border ${errors.houseNumber ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              placeholder={t('form.houseNumberPlaceholder')}
            />
            {errors.houseNumber && <p className="text-xs text-red-500 mt-1">{errors.houseNumber.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.postalCode')}</label>
            <input
              type="text"
              {...register("postalCode")}
              className={`w-full p-2 border ${errors.postalCode ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              placeholder={t('form.postalCodePlaceholder')}
            />
            {errors.postalCode && <p className="text-xs text-red-500 mt-1">{errors.postalCode.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.city')}</label>
            <input
              type="text"
              {...register("city")}
              className={`w-full p-2 border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              placeholder={t('form.cityPlaceholder')}
            />
            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="stateProvince" className="block text-sm font-medium text-gray-700 mb-1">
              State / Province
            </label>
            <input
              type="text"
              id="stateProvince"
              {...register("stateProvince")}
              className={`w-full p-2 border ${errors.stateProvince ? 'border-red-500' : 'border-gray-300'} rounded-md`}
            />
            {errors.stateProvince && <p className="text-xs text-red-500 mt-1">{errors.stateProvince.message}</p>}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country *
            </label>
            <select
              id="country"
              {...register("country")}
              className={`w-full p-2 border ${errors.country ? 'border-red-500' : 'border-gray-300'} rounded-md`}
            >
              <option value="">Select a country</option>
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

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setCurrentStep('cart')}
          className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          {t('buttons.back')}
        </button>
        <button
          onClick={() => { if (isValid) setCurrentStep('review'); else handleSubmit(() => { })() }}
          disabled={!isValid}
          className="py-2 px-6 text-white font-medium rounded-md transition-all disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {t('buttons.reviewOrder')}
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6">{t('steps.reviewAndComplete')}</h2>

      <div className="mb-6 border rounded-md p-4">
        <h3 className="text-lg font-semibold mb-3">{t('sections.yourDevices')}:</h3>
        {estimationCart.map(item => {
          const answered = getAnsweredQuestionsListForItem(item);
          return (
            <div key={item.deviceId} className="py-2 border-b last:border-b-0">
              <div className="flex justify-between items-center">
                <p className="font-medium">{getLocalizedText(item.deviceModel.title, currentLocale, defaultLocale)}</p>
                <p className="text-xs text-gray-500">€ {item.estimatedPrice?.toFixed(2) ?? '0.00'}</p>
              </div>
              {answered.length > 0 && (
                <ul className="ml-4 mt-1 space-y-0.5">
                  {answered.map((qa, idx) => (
                    <li key={idx} className="text-xs text-gray-500"><span className="font-medium text-gray-700">{qa.question}:</span> {qa.answer}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <div className="flex justify-between items-center mt-3 pt-3 border-t font-bold">
          <p>{t('summary.total')}:</p>
          <p style={{ color: primaryColor }}>€ {totalEstimatedPrice.toFixed(2)}</p>
        </div>
      </div>

      <div className="mb-6 border rounded-md p-4">
        <h3 className="text-lg font-semibold mb-3">{t('sections.shippingAddress')}:</h3>
        <p>{watchedFormValues.firstName} {watchedFormValues.lastName}</p>
        <p>{watchedFormValues.streetName} {watchedFormValues.houseNumber}</p>
        <p>{watchedFormValues.postalCode}, {watchedFormValues.city}</p>
        <p>{watchedFormValues.stateProvince || ''}, {watchedFormValues.country}</p>
        <p>Email: {watchedFormValues.email}</p>
        <p>Phone: {watchedFormValues.phoneNumber}</p>
        {watchedFormValues.accountNumber && <p>Account: {watchedFormValues.accountNumber}</p>}
        <button onClick={() => setCurrentStep('info')} className="text-sm text-blue-600 hover:underline mt-2">{t('buttons.edit')} Information</button>
      </div>

      {createOrderMutation.isError && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative flex items-center" role="alert">
          <AlertCircle className="h-5 w-5 mr-2" />
          <div>
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-1">
              {createOrderMutation.error instanceof Error ? createOrderMutation.error.message : t('messages.orderError')}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t">
        <button
          type="button"
          onClick={() => setCurrentStep('info')}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
        >
          {t('buttons.backToInformation')}
        </button>
        <button
          type="button"
          onClick={handleSubmit(handleFinalSubmit)}
          disabled={createOrderMutation.isPending}
          className="px-6 py-2 text-white font-medium rounded-md flex items-center disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {createOrderMutation.isPending ? t('buttons.processing') : t('buttons.confirmAndPlaceOrder')}
          {!createOrderMutation.isPending && <ChevronRight size={16} className="ml-2" />}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor }} className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {currentStep === 'cart' && renderCartStep()}
        {currentStep === 'info' && renderInfoStep()}
        {currentStep === 'review' && renderReviewStep()}
      </div>
    </div>
  );
} 