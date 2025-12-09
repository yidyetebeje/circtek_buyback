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
import { CheckoutVariantProps } from './index';
import { useCreateOrder } from '@/hooks/useOrders';
import { CreateOrderPayload } from '@/lib/api/orderService';
import type { CreateOrderResponseData } from '@/lib/api/orderService';
import { getLocalizedText } from '@/utils/localization';
import { countries } from '@/utils/countries';
import type { CountryCode } from 'libphonenumber-js';
import { useGeoLocation } from '@/hooks/useGeoLocation';

export function MinimalistCheckout({
  currentLocale,
  defaultLocale,
  primaryColor,
  backgroundColor = '#ffffff',
  deviceId
}: CheckoutVariantProps) {
  const [estimationCart, setEstimationCart] = useAtom(estimationCartAtom);
  const router = useRouter();
  const createOrderMutation = useCreateOrder();
  const t = useTranslations('Checkout');

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

  const { countryCode } = useGeoLocation();

  useEffect(() => {
    if (countryCode) {
      setValue('country', countryCode);
    }
  }, [countryCode, setValue]);

  const relevantCartItems = useMemo(() => {
    if (deviceId) {
      return estimationCart.filter(item => item.deviceId === deviceId);
    }
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
                answerTextSnapshot = getLocalizedText(option.title, currentLocale, defaultLocale);
              }
              break;
            }
          }
        }

        return {
          questionKey,
          questionTextSnapshot,
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

  // ---------------- Helper utilities to render answered questions ----------------
  interface QuestionAnswer { question: string; answer: string; originalKey?: string; }

  const getEnhancedLocalizedText = (
    textObj: any,
    locale: string,
    defaultLocale: string,
  ): string => {
    if (!textObj) return '';
    if (typeof textObj === 'string') return textObj;
    return textObj[locale] || textObj[defaultLocale] || Object.values(textObj)[0] || '';
  };

  const getAnsweredQuestionsListForItem = (item: InProgressEstimation): QuestionAnswer[] => {
    if (!item?.answers) return [];
    const questions: any[] = [];
    if (item.deviceModel?.questionSetAssignments) {
      for (const assignment of item.deviceModel.questionSetAssignments) {
        if (assignment.questionSet?.questions) {
          questions.push(...assignment.questionSet.questions);
        }
      }
    }
    const sortedQuestions = questions.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0));
    const answeredQuestions: QuestionAnswer[] = [];
    Object.entries(item.answers).forEach(([qKey, aVal]) => {
      const q = sortedQuestions.find(qi => qi.key === qKey || String(qi.id) === qKey);
      let qText = qKey, aText = String(aVal);
      if (q) {
        qText = getEnhancedLocalizedText(q.title, currentLocale, defaultLocale);
        const opt = q.options?.find((o: any) => o.key === aVal || String(o.id) === aVal);
        if (opt) aText = getEnhancedLocalizedText(opt.title, currentLocale, defaultLocale);
      }
      answeredQuestions.push({ question: qText, answer: aText, originalKey: qKey });
    });
    return answeredQuestions;
  };

  if (relevantCartItems.length === 0) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4" style={{ backgroundColor }}>
        <div className="bg-white p-10 rounded-md shadow-sm text-center max-w-md">
          <h2 className="text-2xl font-medium text-gray-800 mb-4">{t('emptyCart.title')}</h2>
          <p className="text-gray-600 mb-8">{t('emptyCart.description')}</p>
          <a
            href={`/${currentLocale}`}
            className="px-6 py-3 text-white font-medium rounded-md hover:bg-opacity-90 transition-colors duration-150 inline-block"
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
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-light text-center text-gray-800 mb-10">{t('title')}</h1>

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

        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <div className="p-6 border-b" style={{ borderColor: `${primaryColor}20` }}>
            <h2 className="text-lg font-medium mb-4">{t('sections.yourOrder')}</h2>

            <div className="divide-y" style={{ borderColor: `${primaryColor}10` }}>
              {relevantCartItems.map((item) => {
                const deviceModel = item.deviceModel;
                const deviceName = getLocalizedText(deviceModel.title, currentLocale, defaultLocale);
                const deviceImageUrl = deviceModel.model_image || '/placeholder-image.png';
                const specifications = deviceModel.specifications;
                const storage = specifications && typeof specifications.storage === 'string' ? specifications.storage : 'N/A';
                const answeredQuestions = getAnsweredQuestionsListForItem(item);

                return (
                  <div key={item.deviceId} className="py-4">
                    <div className="flex items-center">
                      <img src={deviceImageUrl} alt={deviceName} className="w-16 h-16 object-contain rounded-md mr-4" />
                      <div className="flex-grow">
                        <div className="flex justify-between">
                          <h3 className="font-medium text-gray-800">{deviceName}</h3>
                          <span className="font-medium">€ {item.estimatedPrice?.toFixed(2) ?? '0.00'}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {deviceModel.brand?.title ? getLocalizedText(deviceModel.brand.title, currentLocale, defaultLocale) : ''} {storage !== 'N/A' ? ` | ${storage}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditItem(item.deviceId)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors"
                          title={t('buttons.editItem')}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.deviceId)}
                          className="p-1.5 text-gray-500 hover:text-red-600 transition-colors"
                          title={t('buttons.removeItem')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {answeredQuestions.length > 0 && (
                      <div className="mt-2 ml-20 pt-1 border-t border-gray-100">
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

              <div className="py-4 flex justify-between items-center font-medium text-lg">
                <span>{t('summary.total')}</span>
                <span style={{ color: primaryColor }}>€ {totalEstimatedPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            <h2 className="text-lg font-medium mb-6">{t('sections.shippingInformation')}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.firstName')}</label>
                <input
                  type="text"
                  {...register("firstName")}
                  className={`w-full p-2.5 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-md bg-gray-50`}
                  placeholder={t('form.firstNamePlaceholder')}
                />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.lastName')}</label>
                <input
                  type="text"
                  {...register("lastName")}
                  className={`w-full p-2.5 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-md bg-gray-50`}
                  placeholder={t('form.lastNamePlaceholder')}
                />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.email')}</label>
                <input
                  type="email"
                  {...register("email")}
                  className={`w-full p-2.5 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md bg-gray-50`}
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

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.accountNumberOptional')}</label>
                <input
                  type="text"
                  {...register("accountNumber")}
                  className={`w-full p-2.5 border ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'} rounded-md bg-gray-50`}
                  placeholder={t('form.ibanPlaceholder')}
                />
                {errors.accountNumber && <p className="text-xs text-red-500 mt-1">{errors.accountNumber.message}</p>}
              </div>

              <div className="md:col-span-2 grid grid-cols-3 gap-x-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.streetName')}</label>
                  <input
                    type="text"
                    {...register("streetName")}
                    className={`w-full p-2.5 border ${errors.streetName ? 'border-red-500' : 'border-gray-300'} rounded-md bg-gray-50`}
                    placeholder={t('form.streetNamePlaceholder')}
                  />
                  {errors.streetName && <p className="text-xs text-red-500 mt-1">{errors.streetName.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.houseNumber')}</label>
                  <input
                    type="text"
                    {...register("houseNumber")}
                    className={`w-full p-2.5 border ${errors.houseNumber ? 'border-red-500' : 'border-gray-300'} rounded-md bg-gray-50`}
                    placeholder={t('form.houseNumberPlaceholder')}
                  />
                  {errors.houseNumber && <p className="text-xs text-red-500 mt-1">{errors.houseNumber.message}</p>}
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.postalCode')}</label>
                  <input
                    type="text"
                    {...register("postalCode")}
                    className={`w-full p-2.5 border ${errors.postalCode ? 'border-red-500' : 'border-gray-300'} rounded-md bg-gray-50`}
                    placeholder={t('form.postalCodePlaceholder')}
                  />
                  {errors.postalCode && <p className="text-xs text-red-500 mt-1">{errors.postalCode.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.city')}</label>
                  <input
                    type="text"
                    {...register("city")}
                    className={`w-full p-2.5 border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded-md bg-gray-50`}
                    placeholder={t('form.cityPlaceholder')}
                  />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.stateProvince')}</label>
                  <input
                    type="text"
                    {...register("stateProvince")}
                    className={`w-full p-2.5 border ${errors.stateProvince ? 'border-red-500' : 'border-gray-300'} rounded-md bg-gray-50`}
                    placeholder={t('form.stateProvincePlaceholder')}
                  />
                  {errors.stateProvince && <p className="text-xs text-red-500 mt-1">{errors.stateProvince.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.country')}</label>
                  <select
                    {...register("country")}
                    className={`w-full p-2.5 border ${errors.country ? 'border-red-500' : 'border-gray-300'} rounded-md bg-gray-50`}
                  >
                    <option value="">{t('form.selectCountryPlaceholder')}</option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country.message}</p>}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={createOrderMutation.isPending}
                className="w-full py-3 px-4 text-white font-medium rounded-md transition-colors disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {createOrderMutation.isPending ? t('buttons.processing') : t('buttons.completeOrder')}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              {t('messages.termsAndConditionsShort')}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
