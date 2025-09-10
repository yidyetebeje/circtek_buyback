"use client";

import React, { useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  displayConfigAtom, 
  activeComponentAtom, 
  previewConfigAtom, 
  shopConfigAtom,
  estimationCartAtom 
} from '@/store/atoms';
import { Header } from '@/components/layout/Header';
import { ComponentEditor } from '@/components/config/ComponentEditor';
import { ComponentType, ShopConfig } from '@/types/shop';
import { 
  CheckCircle, 
  Package, 
  Mail, 
  Truck, 
  Calendar,
  Home,
  Plus,
  Phone
} from 'lucide-react';

interface ThankYouPageClientProps {
  currentLocale: string;
  defaultLocale: string;
}

export function ThankYouPageClient({
  currentLocale,
}: ThankYouPageClientProps) {
  const displayConfig = useAtomValue(displayConfigAtom);
  const [activeComponent, setActiveComponent] = useAtom(activeComponentAtom);
  const [previewConfig, setPreviewConfig] = useAtom(previewConfigAtom);
  const [, setShopConfig] = useAtom(shopConfigAtom);
  const [, setEstimationCart] = useAtom(estimationCartAtom);
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations('ThankYou');
  
  const isAuthenticated = status === "authenticated";

  // Get the primary color from the theme
  const primaryColor = displayConfig.theme.primary || '#3b82f6';
  
  // Get the background color from the theme or default to light gray
  const backgroundColor = displayConfig.theme.background || '#f9fafb';

  // Clear cart after successful order
  useEffect(() => {
    const timer = setTimeout(() => {
      setEstimationCart([]);
    }, 2000);

    return () => clearTimeout(timer);
  }, [setEstimationCart]);

  const handleEditThankYou = () => {
    setActiveComponent('checkout' as ComponentType);
    setPreviewConfig(null);
  };

  const closeEditorAndApplyChanges = () => {
    if (previewConfig) {
      setShopConfig(previewConfig as ShopConfig);
    }
    setPreviewConfig(null);
    setActiveComponent(null);
  };

  // Navigate to home without keeping the success page in history so that the back
  // button on mobile does **not** return to this page. Using `router.replace`
  // swaps the current history entry instead of pushing a new one.
  const handleContinueSelling = () => {
    router.replace(`/${currentLocale}`);
  };

  const handleGoHome = () => {
    router.replace(`/${currentLocale}`);
  };

  // Read the order reference passed through query parameters (fallback to timestamp if not provided)
  const searchParams = useSearchParams();
  const orderRefParam = searchParams.get('orderRef') || searchParams.get('orderNumber');
  const orderRef = orderRefParam || `ORD-${Date.now().toString().slice(-8)}`;

  // Prepare phone number for tel: link (strip non-digit except leading +)
  const rawPhone = displayConfig.contactInfo?.phone ?? '+31 (0) 20 123 4567';
  const telPhone = `tel:${rawPhone.replace(/[^+\d]/g, '')}`;

  return (
    <div style={{ backgroundColor }} className="flex flex-col min-h-screen relative">
      {isAuthenticated && (
        <button
          onClick={handleEditThankYou}
          className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-[100] flex items-center justify-center"
          title="Edit Thank You Page Style"
          aria-label="Edit Thank You Page Style"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}

      <Header shopConfig={displayConfig} />
      
      <div className="flex-grow flex items-center justify-center py-12 px-4">
        <div className="max-w-2xl w-full">
          {/* Success Animation Container */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 animate-pulse" 
                 style={{ backgroundColor: `${primaryColor}20` }}>
              <CheckCircle size={48} style={{ color: primaryColor }} />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              {t('title')}
            </h1>
            
            <p className="text-lg text-gray-600 mb-2">
              {t('subtitle')}
            </p>
            
            <p className="text-sm text-gray-500">
              {t('orderReference')}: <span className="font-mono font-medium">{orderRef}</span>
            </p>
          </div>

          {/* What Happens Next Section */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <Calendar size={20} className="mr-2" style={{ color: primaryColor }} />
              {t('nextSteps.title')}
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-1"
                     style={{ backgroundColor: `${primaryColor}20` }}>
                  <Mail size={16} style={{ color: primaryColor }} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{t('nextSteps.confirmation.title')}</h3>
                  <p className="text-sm text-gray-600">{t('nextSteps.confirmation.description')}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-1"
                     style={{ backgroundColor: `${primaryColor}20` }}>
                  <Package size={16} style={{ color: primaryColor }} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{t('nextSteps.shipping.title')}</h3>
                  <p className="text-sm text-gray-600">{t('nextSteps.shipping.description')}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-1"
                     style={{ backgroundColor: `${primaryColor}20` }}>
                  <Truck size={16} style={{ color: primaryColor }} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{t('nextSteps.processing.title')}</h3>
                  <p className="text-sm text-gray-600">{t('nextSteps.processing.description')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-800 mb-2">{t('importantInfo.title')}</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {t('importantInfo.keepEmail')}</li>
              <li>• {t('importantInfo.packageSecurely')}</li>
              <li>• {t('importantInfo.includeItems')}</li>
              <li>• {t('importantInfo.trackShipment')}</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleContinueSelling}
              className="flex-1 flex items-center justify-center px-6 py-3 text-white font-medium rounded-lg transition-colors duration-150"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus size={18} className="mr-2" />
              {t('buttons.sellMoreDevices')}
            </button>
            
            <button
              onClick={handleGoHome}
              className="flex-1 flex items-center justify-center px-6 py-3 border-2 font-medium rounded-lg transition-colors duration-150 text-gray-700 hover:bg-gray-50"
              style={{ borderColor: primaryColor }}
            >
              <Home size={18} className="mr-2" />
              {t('buttons.backToHome')}
            </button>
          </div>

          {/* Support Information */}
          <div className="text-center mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              {t('support.needHelp')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <a 
                href="mailto:support@example.com" 
                className="text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Mail size={14} className="mr-1" />
                {t('support.email')}
              </a>
              <span className="hidden sm:inline text-gray-400">|</span>
              <a 
                href={telPhone}
                className="text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Phone size={14} className="mr-1" />
                {t('support.phone')}: {rawPhone}
              </a>
            </div>
          </div>
        </div>
      </div>

      {isAuthenticated && (
        <ComponentEditor
          isOpen={activeComponent === 'checkout'}
          onClose={closeEditorAndApplyChanges}
        />
      )}
    </div>
  );
} 