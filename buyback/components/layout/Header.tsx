"use client";

import { useAtom, useAtomValue } from 'jotai';
import { ComponentType, ShopConfig } from "@/types/shop";
import { getHeaderVariant } from "./header-variants/HeaderVariants";
import { HeaderVariantType } from "./header-variants";
import { activeComponentAtom, estimationCartAtom, previewConfigAtom, editModeAtom } from '@/store/atoms';
import { useSession } from 'next-auth/react';

interface HeaderProps {
  shopConfig: ShopConfig;
}

export function Header({ shopConfig }: HeaderProps) {
  const estimationCart = useAtomValue(estimationCartAtom);
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isEditMode = useAtomValue(editModeAtom);
  const canEdit = isAuthenticated && isEditMode;
  
  // Get the selected header variant or use default if not specified
  const headerVariant = shopConfig.headerVariant || 'default';
  const [, setPreviewConfig] = useAtom(previewConfigAtom);
  const [, setActiveComponent] = useAtom(activeComponentAtom);
  const HeaderVariantComponent = getHeaderVariant(headerVariant as HeaderVariantType);
  const handleComponentEdit = (componentType: ComponentType) => {
    setActiveComponent(componentType);
    // Clear any previous preview when opening the editor
    setPreviewConfig(null);
  };
  return (
    <header className="w-full border-b border-gray-200" style={{ 
      backgroundColor: shopConfig.theme.background, 
      color: shopConfig.theme.text 
    }}>
       {/* Edit button for Hero Section is outside, HeroSection component does not need onEdit */}
       <div className="relative z-[10000000]">
          {canEdit && (
        <button 
          onClick={() => handleComponentEdit('header')}
          className="z-[10000000] absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all w-8 h-8 flex items-center justify-center"
          title="Edit Header"
          aria-label="Edit Header"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
      )}
      </div>
    
      <HeaderVariantComponent shopConfig={shopConfig} estimationCart={estimationCart} />
     
      
    </header>
  );
  
}