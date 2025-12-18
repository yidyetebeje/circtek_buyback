/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { isValidIBAN } from 'ibantools';
import { PhoneInput } from '@/components/ui/phone-input';
import { Pencil, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { estimationCartAtom } from '@/store/atoms';
import { CheckoutVariantProps } from './index';
import { getLocalizedText } from '@/utils/localization';
import { countries } from '@/utils/countries';
import type { CountryCode } from 'libphonenumber-js';
import { useGeoLocation } from '@/hooks/useGeoLocation';

export function SteppedCheckout({
  currentLocale,
  defaultLocale,
  primaryColor,
  backgroundColor = '#f8f9fa',
  deviceId
}: CheckoutVariantProps) {
  const [estimationCart, setEstimationCart] = useAtom(estimationCartAtom);
  const router = useRouter();
  const t = useTranslations('Checkout');

  // Step management
  const [openSection, setOpenSection] = useState<'cart' | 'shipping' | 'review'>('cart');
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

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
    country: z.string().trim().min(1, { message: t('validation.countryRequired') }),
  }), [t]);

  type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isValid },
    watch,
    trigger,
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
      country: '',
    },
    mode: 'onChange'
  });

  const formValues = watch();

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

  const onSubmit = (data: CheckoutFormData) => {
    if (relevantCartItems.length === 0) {
      alert(t('messages.emptyCartAlert'));
      return;
    }

    // Mark order as submitted to prevent empty cart UI during redirect
    setIsOrderSubmitted(true);

    console.log('Order Submitted (Validated):', {
      formData: data,
      items: relevantCartItems.map(item => ({
        deviceId: item.deviceId,
        deviceModelSefUrl: item.deviceModel.sef_url,
        estimatedPrice: item.estimatedPrice,
        answers: item.answers,
      })),
      totalPrice: totalEstimatedPrice,
    });
    router.push(`/${currentLocale}/sell/thank-you`);
  };

  const handleEditItem = (deviceId: string) => {
    router.push(`/${currentLocale}/sell/${deviceId}/estimate`);
  };

  const handleRemoveItem = (deviceId: string) => {
    setEstimationCart(prevCart => prevCart.filter(item => item.deviceId !== deviceId));
  };

  const handleSectionClick = async (section: 'cart' | 'shipping' | 'review') => {
    // If trying to open shipping, make sure cart is complete
    if (section === 'shipping' && !completedSections.has('cart')) {
      if (relevantCartItems.length > 0) {
        setCompletedSections(prev => new Set([...prev, 'cart']));
      } else {
        return; // Don't open shipping if cart is empty
      }
    }

    // If trying to open review, make sure shipping info is valid
    if (section === 'review' && !completedSections.has('shipping')) {
      const isShippingValid = await trigger();
      if (isShippingValid) {
        setCompletedSections(prev => new Set([...prev, 'shipping']));
      } else {
        setOpenSection('shipping');
        return; // Don't open review if shipping is invalid
      }
    }

    setOpenSection(section);
  };

  // Show loading state if order was submitted (redirecting to thank-you page)
  // This prevents the empty cart message from flashing during navigation
  if (isOrderSubmitted) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4" style={{ backgroundColor }}>
        <div className="bg-white p-10 rounded-lg shadow-md text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: primaryColor }}></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('buttons.processing')}</h2>
          <p className="text-gray-600">{t('messages.pleaseWait') || 'Please wait...'}</p>
        </div>
      </div>
    );
  }

  if (relevantCartItems.length === 0) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4" style={{ backgroundColor }}>
        <div className="bg-white p-10 rounded-lg shadow-md text-center max-w-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{t('emptyCart.title')}</h2>
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
    <div style={{ backgroundColor }} className="min-h-screen py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-2xl font-bold text-center mb-8">{t('title')}</h1>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Cart Section */}
          <div className="border-b border-gray-200">
            <button
              className="w-full px-6 py-4 flex items-center justify-between focus:outline-none"
              onClick={() => handleSectionClick('cart')}
            >
              <div className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white"
                  style={{ backgroundColor: completedSections.has('cart') ? primaryColor : 'gray' }}
                >
                  {completedSections.has('cart') ? <Check size={16} /> : 1}
                </div>
                <span className="font-medium text-lg">{t('sections.yourDevices')}</span>
              </div>
              {openSection === 'cart' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {openSection === 'cart' && (
              <div className="px-6 pb-6">
                <div className="space-y-4">
                  {relevantCartItems.map((item) => {
                    const deviceModel = item.deviceModel;
                    const deviceName = getLocalizedText(deviceModel.title, currentLocale, defaultLocale);
                    const deviceImageUrl = deviceModel.model_image || '/placeholder-image.png';
                    const specifications = deviceModel.specifications;
                    const storage = specifications && typeof specifications.storage === 'string' ? specifications.storage : 'N/A';

                    return (
                      <div key={item.deviceId} className="flex items-start p-3 border rounded-md border-gray-200">
                        <img src={deviceImageUrl} alt={deviceName} className="w-16 h-16 object-contain mr-3" />
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{deviceName}</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {deviceModel.brand?.title ? getLocalizedText(deviceModel.brand.title, currentLocale, defaultLocale) : ''} - {storage}
                              </p>
                            </div>
                            <span className="font-medium">€ {item.estimatedPrice?.toFixed(2) ?? '0.00'}</span>
                          </div>
                          <div className="flex mt-2 space-x-2">
                            <button
                              onClick={() => handleEditItem(item.deviceId)}
                              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center"
                            >
                              <Pencil size={12} className="mr-1" /> Edit
                            </button>
                            <button
                              onClick={() => handleRemoveItem(item.deviceId)}
                              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-red-600 flex items-center"
                            >
                              <Trash2 size={12} className="mr-1" /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between mt-6 pb-2 border-b border-gray-200">
                  <span className="font-medium">Subtotal</span>
                  <span>€ {totalEstimatedPrice.toFixed(2)}</span>
                </div>

                <div className="flex justify-between mt-2 text-lg font-semibold">
                  <span>Total</span>
                  <span style={{ color: primaryColor }}>€ {totalEstimatedPrice.toFixed(2)}</span>
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => router.push(`/${currentLocale}`)}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Add More Devices
                  </button>
                  <button
                    onClick={() => handleSectionClick('shipping')}
                    className="py-2.5 px-5 text-white font-medium rounded-md"
                    style={{ backgroundColor: primaryColor }}
                    disabled={relevantCartItems.length === 0}
                  >
                    Continue to Shipping
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Shipping Information Section */}
          <div className="border-b border-gray-200">
            <button
              className={`w-full px-6 py-4 flex items-center justify-between focus:outline-none ${!completedSections.has('cart') ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleSectionClick('shipping')}
              disabled={!completedSections.has('cart')}
            >
              <div className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white"
                  style={{ backgroundColor: completedSections.has('shipping') ? primaryColor : 'gray' }}
                >
                  {completedSections.has('shipping') ? <Check size={16} /> : 2}
                </div>
                <span className="font-medium text-lg">Shipping Information</span>
              </div>
              {openSection === 'shipping' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {openSection === 'shipping' && (
              <div className="px-6 pb-6">
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        {...register("firstName")}
                        className={`w-full p-2.5 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                      />
                      {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        {...register("lastName")}
                        className={`w-full p-2.5 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                      />
                      {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      {...register("email")}
                      className={`w-full p-2.5 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <Controller
                      name="phoneNumber"
                      control={control}
                      render={({ field }) => (
                        <PhoneInput
                          {...field}
                          international
                          defaultCountry={(countryCode ?? 'ET') as CountryCode}
                          className={errors.phoneNumber ? 'phone-input-error-wrapper' : ''}
                        />
                      )}
                    />
                    {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number (Optional)</label>
                    <input
                      type="text"
                      {...register("accountNumber")}
                      className={`w-full p-2.5 border ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                      placeholder={t('form.ibanPlaceholder')}
                    />
                    {errors.accountNumber && <p className="text-xs text-red-500 mt-1">{errors.accountNumber.message}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Name</label>
                      <input
                        type="text"
                        {...register("streetName")}
                        className={`w-full p-2.5 border ${errors.streetName ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                      />
                      {errors.streetName && <p className="text-xs text-red-500 mt-1">{errors.streetName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">House Number</label>
                      <input
                        type="text"
                        {...register("houseNumber")}
                        className={`w-full p-2.5 border ${errors.houseNumber ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                      />
                      {errors.houseNumber && <p className="text-xs text-red-500 mt-1">{errors.houseNumber.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        {...register("postalCode")}
                        className={`w-full p-2.5 border ${errors.postalCode ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                      />
                      {errors.postalCode && <p className="text-xs text-red-500 mt-1">{errors.postalCode.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        {...register("city")}
                        className={`w-full p-2.5 border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                      />
                      {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                    </div>
                  </div>

                  <div className="col-span-6">
                    <div className="flex flex-col">
                      <label
                        htmlFor="country"
                        className="text-sm font-medium text-gray-900 mb-1"
                      >
                        Country *
                      </label>
                      <select
                        id="country"
                        {...register('country')}
                        className={`w-full p-2.5 border ${errors.country ? 'border-red-500' : 'border-gray-300'} rounded-md`}
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
                    onClick={() => setOpenSection('cart')}
                    className="text-gray-600 hover:text-gray-800 py-2 px-4 border border-gray-300 rounded-md"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleSectionClick('review')}
                    className="py-2.5 px-5 text-white font-medium rounded-md"
                    style={{ backgroundColor: primaryColor }}
                    disabled={!isValid}
                  >
                    Review Order
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Review & Submit Section */}
          <div>
            <button
              className={`w-full px-6 py-4 flex items-center justify-between focus:outline-none ${!completedSections.has('shipping') ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleSectionClick('review')}
              disabled={!completedSections.has('shipping')}
            >
              <div className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white bg-gray-500"
                >
                  3
                </div>
                <span className="font-medium text-lg">Review & Complete Order</span>
              </div>
              {openSection === 'review' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {openSection === 'review' && (
              <div className="px-6 pb-6">
                <div className="space-y-6 mt-4">
                  <div>
                    <h3 className="font-medium mb-2">Shipping Information</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p>{formValues.firstName} {formValues.lastName}</p>
                      <p>{formValues.streetName} {formValues.houseNumber}</p>
                      <p>{formValues.postalCode} {formValues.city}</p>
                      <p>{formValues.country}</p>
                      <p className="mt-2">{formValues.email}</p>
                      <p>{formValues.phoneNumber}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Order Summary</h3>
                    <div className="space-y-2">
                      {relevantCartItems.map((item) => {
                        const deviceName = getLocalizedText(item.deviceModel.title, currentLocale, defaultLocale);
                        return (
                          <div key={item.deviceId} className="flex justify-between border-b pb-2">
                            <span>{deviceName}</span>
                            <span>€ {item.estimatedPrice?.toFixed(2) ?? '0.00'}</span>
                          </div>
                        );
                      })}

                      <div className="flex justify-between pt-2 font-bold">
                        <span>Total</span>
                        <span style={{ color: primaryColor }}>€ {totalEstimatedPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-md text-sm text-gray-600">
                    <p>
                      By placing this order, you agree to our Terms of Service and Privacy Policy.
                      A shipping label will be sent to your email address after order confirmation.
                    </p>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setOpenSection('shipping')}
                      className="text-gray-600 hover:text-gray-800 py-2 px-4 border border-gray-300 rounded-md"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit(onSubmit)}
                      className="py-3 px-6 text-white font-medium rounded-md"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 