"use client";

import React from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useSession } from 'next-auth/react';
import { displayConfigAtom, activeComponentAtom, previewConfigAtom, shopConfigAtom, editModeAtom } from '@/store/atoms';
import { Header } from '@/components/layout/Header';
import { CheckoutVariants } from './checkout-variants';
import { ComponentEditor } from '@/components/config/ComponentEditor';
import { ConfigActionButtons } from '@/components/config/ConfigActionButtons';
import { ComponentType, ShopConfig } from '@/types/shop';
import { useUpdateShopConfig } from '@/hooks/catalog/useShops';

interface CheckoutPageClientProps {
  currentLocale: string;
  defaultLocale: string;
  deviceId?: string; // Optional device ID for single-device checkout flow
}

export function CheckoutPageClient({
  currentLocale,
  defaultLocale,
  deviceId, // Optional device ID for single-device checkout flow
}: CheckoutPageClientProps) {
  const displayConfig = useAtomValue(displayConfigAtom);
  const [activeComponent, setActiveComponent] = useAtom(activeComponentAtom);
  const [previewConfig, setPreviewConfig] = useAtom(previewConfigAtom);
  const [, setShopConfig] = useAtom(shopConfigAtom);
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isEditMode = useAtomValue(editModeAtom);
  const canEdit = isAuthenticated && isEditMode;
  
  // Get the shop ID from the display config
  const shopId = displayConfig.shopId ? parseInt(displayConfig.shopId) : 0;
  
  // Add the mutation hook for updating shop config
  const { mutate: updateShopConfig } = useUpdateShopConfig(shopId);

  // Get the primary color from the theme
  const primaryColor = displayConfig.theme.primary || '#3b82f6';
  
  // Get the background color from the theme or default to light gray
  const backgroundColor = displayConfig.theme.background || '#f9fafb';
  
  // Get the checkout variant from the config or default to 'default'
  const checkoutVariant = displayConfig.checkoutVariant || 'default';
  
  // Dynamically select the checkout component based on the variant
  const CheckoutComponent = CheckoutVariants[checkoutVariant];

  const handleEditCheckout = () => {
    setActiveComponent('checkout' as ComponentType);
    setPreviewConfig(null);
  };
  
  // Handle saving config changes to the backend
  const handleSaveConfigToBackend = (config: ShopConfig) => {
    if (shopId) {
      updateShopConfig(config, {
        onSuccess: () => {
          console.log('Shop configuration updated successfully');
        },
        onError: (error) => {
          console.error('Failed to update shop configuration:', error);
        }
      });
    }
  };

  const closeEditorAndApplyChanges = () => {
    if (previewConfig) {
      // Only update local config, do NOT save to backend
      // Wait for user to explicitly publish changes
      setShopConfig(previewConfig as ShopConfig);
    }
    setPreviewConfig(null);
    setActiveComponent(null);
  };
  
  return (
    <div style={{ backgroundColor }} className="flex flex-col min-h-screen relative">
      {canEdit && (
        <button
          onClick={handleEditCheckout}
          className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-[100] flex items-center justify-center"
          title="Edit Checkout Style"
          aria-label="Edit Checkout Style"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}

      <Header shopConfig={displayConfig} />
      
      <CheckoutComponent
        currentLocale={currentLocale}
        defaultLocale={defaultLocale}
        primaryColor={primaryColor}
        backgroundColor={backgroundColor}
        deviceId={deviceId} // Pass the deviceId to the checkout component
      />

      {/* Add the ConfigActionButtons component for publish/discard */}
      {canEdit && (
        <ConfigActionButtons onUpdateShopConfig={handleSaveConfigToBackend} />
      )}
      
      {canEdit && (
        <ComponentEditor
          isOpen={activeComponent === 'checkout'}
          onClose={closeEditorAndApplyChanges}
          onUpdateShopConfig={handleSaveConfigToBackend}
        />
      )}
    </div>
  );
} 